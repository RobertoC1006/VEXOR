import { stockAlert } from './queries.js';
import { ConflictException, Injectable } from '@nestjs/common';
import { sql, type Transaction } from 'kysely';
import { DatabaseService, type Actor } from '../../compartido/database/database.service.js';
import { requirePermission, type Database } from '../../compartido/database/database.js';
import { requireInventoryLocal, inventoryRights } from './access.js';
import { requireProductRead } from '../productos/productos.service.js';
import { page } from '../../compartido/http/pagination.js';
import type { CountSaveDto, CountConfirmDto, InventoryQueryDto, MinimumSaveDto } from './dto.js';

@Injectable()
export class InventoryService {
  constructor(private readonly database: DatabaseService) {}
  private async context(tx: Transaction<Database>, negocioId: string, localId: string) {
    await requireInventoryLocal(tx, negocioId, localId);
    await requireProductRead(tx);
  }
  list(actor: Actor, negocioId: string, localId: string, p: InventoryQueryDto) {
    return this.database.tenant(actor, negocioId, async (tx) => {
      await this.context(tx, negocioId, localId);
      const rights = await inventoryRights(tx, localId);
      let query = tx
        .selectFrom('app.productos as p')
        .leftJoin('app.inventario_inicial as i', (join) =>
          join
            .onRef('i.negocio_id', '=', 'p.negocio_id')
            .onRef('i.producto_id', '=', 'p.id')
            .on('i.local_id', '=', localId),
        )
        .leftJoin('app.stock_minimos as m', (j) =>
          j
            .onRef('m.negocio_id', '=', 'p.negocio_id')
            .onRef('m.producto_id', '=', 'p.id')
            .on('m.local_id', '=', localId),
        )
        .leftJoin('app.productos as raiz', (join) =>
          join
            .onRef('raiz.negocio_id', '=', 'p.negocio_id')
            .onRef('raiz.id', '=', 'p.producto_padre_id'),
        )
        .select([
          'p.id',
          'm.minimo',
          'p.precio',
          'p.caracteristicas',
          'p.producto_padre_id',
          'raiz.nombre as modelo_nombre',
          'p.nombre',
          'p.codigo',
          'p.alias',
          'p.activo',
          'i.cantidad',
          'i.referencia',
          'i.confirmado_en',
        ])
        .select(sql<number>`coalesce(raiz.foto_version, p.foto_version)`.as('foto_version'))
        .select(sql<string>`coalesce(i.estado, 'pendiente')`.as('estado'))
        .select(sql<number>`coalesce(m.version, 0)`.as('minimo_version'))
        .select(sql<number>`coalesce(i.version, 0)`.as('version'))
        .where('p.nivel_registro', '!=', 'avanzado')
        .select(
          sql<string>`coalesce((select raiz.nombre || ' · ' from app.productos raiz
          where raiz.negocio_id = p.negocio_id and raiz.id = p.producto_padre_id), '') || p.nombre`.as(
            'nombre_completo',
          ),
        )
        .where('p.negocio_id', '=', negocioId);
      let focused;
      if (p.producto_id) {
        focused = await tx
          .selectFrom('app.productos as foco')
          .leftJoin('app.productos as modelo', (j) =>
            j
              .onRef('modelo.negocio_id', '=', 'foco.negocio_id')
              .onRef('modelo.id', '=', 'foco.producto_padre_id'),
          )
          .select(['foco.id', 'foco.nivel_registro'])
          .select(sql<string>`coalesce(modelo.nombre || ' · ', '') || foco.nombre`.as('nombre'))
          .where('foco.negocio_id', '=', negocioId)
          .where('foco.id', '=', p.producto_id)
          .executeTakeFirstOrThrow();
        query = query.where((eb) =>
          eb.or([eb('p.id', '=', p.producto_id!), eb('p.producto_padre_id', '=', p.producto_id!)]),
        );
      }
      if (p.estado_stock) {
        query = query
          .where('p.activo', '=', true)
          .where(sql<boolean>`(p.producto_padre_id is null or raiz.activo)`);
        query =
          p.estado_stock === 'bajo'
            ? query.where(stockAlert())
            : query.where('i.confirmado_en', 'is', null);
      }
      if (p.codigo)
        query = query.where(sql<boolean>`(p.codigo = ${p.codigo} or exists (
        select 1 from app.productos raiz where raiz.negocio_id = p.negocio_id
        and raiz.id = p.producto_padre_id and raiz.codigo = ${p.codigo}))`);
      if (p.q)
        query = query.where(sql<boolean>`(strpos(lower(p.nombre), lower(${p.q})) > 0 or
        strpos(lower(coalesce(p.alias, '')), lower(${p.q})) > 0 or p.codigo = ${p.q} or exists (
          select 1 from app.productos raiz where raiz.negocio_id = p.negocio_id and raiz.id = p.producto_padre_id
          and (strpos(lower(raiz.nombre), lower(${p.q})) > 0 or raiz.codigo = ${p.q})))`);
      return {
        ...page(
          await query
            .orderBy('p.nombre')
            .orderBy('p.id')
            .limit(p.limit + 1)
            .offset(p.offset)
            .execute(),
          p,
        ),
        permisos: rights,
        ...(focused ? { producto_filtrado: focused } : {}),
      };
    });
  }
  minimum(
    actor: Actor,
    negocioId: string,
    localId: string,
    productoId: string,
    data: MinimumSaveDto,
  ) {
    return this.database.tenant(actor, negocioId, async (tx) => {
      await this.context(tx, negocioId, localId);
      await requirePermission(tx, 'inventario.confirmar', localId);
      await sql`select pg_advisory_xact_lock(hashtext(${negocioId + localId + productoId}))`.execute(
        tx,
      );
      await tx
        .selectFrom('app.productos')
        .select('id')
        .where('negocio_id', '=', negocioId)
        .where('id', '=', productoId)
        .where('nivel_registro', '!=', 'avanzado')
        .executeTakeFirstOrThrow();
      const current = await tx
        .selectFrom('app.stock_minimos')
        .selectAll()
        .where('negocio_id', '=', negocioId)
        .where('local_id', '=', localId)
        .where('producto_id', '=', productoId)
        .executeTakeFirst();
      if ((current?.version ?? 0) !== data.version)
        throw new ConflictException('El mínimo cambió; actualiza el inventario');
      return tx
        .insertInto('app.stock_minimos')
        .values({
          negocio_id: negocioId,
          local_id: localId,
          producto_id: productoId,
          minimo: data.minimo,
        })
        .onConflict((c) =>
          c
            .columns(['negocio_id', 'local_id', 'producto_id'])
            .doUpdateSet({ minimo: data.minimo, version: (current?.version ?? 0) + 1 }),
        )
        .returningAll()
        .executeTakeFirstOrThrow();
    });
  }
  save(actor: Actor, negocioId: string, localId: string, productoId: string, data: CountSaveDto) {
    return this.database.tenant(actor, negocioId, async (tx) => {
      await this.context(tx, negocioId, localId);
      await requirePermission(tx, 'inventario.contar', localId);
      await tx
        .selectFrom('app.productos')
        .select('id')
        .where('negocio_id', '=', negocioId)
        .where('id', '=', productoId)
        .executeTakeFirstOrThrow();
      const query = tx
        .selectFrom('app.inventario_inicial')
        .selectAll()
        .where('negocio_id', '=', negocioId)
        .where('local_id', '=', localId)
        .where('producto_id', '=', productoId);
      const current = await query.forUpdate().executeTakeFirst();
      if ((current?.version ?? 0) !== data.version || current?.estado === 'confirmado')
        throw new ConflictException(
          'El conteo cambió o ya fue confirmado; actualiza el inventario',
        );
      if (!current)
        return tx
          .insertInto('app.inventario_inicial')
          .values({
            negocio_id: negocioId,
            local_id: localId,
            producto_id: productoId,
            cantidad: data.cantidad,
            referencia: data.referencia,
          })
          .returningAll()
          .executeTakeFirstOrThrow();
      return tx
        .updateTable('app.inventario_inicial')
        .set({ cantidad: data.cantidad, referencia: data.referencia })
        .where('negocio_id', '=', negocioId)
        .where('local_id', '=', localId)
        .where('producto_id', '=', productoId)
        .returningAll()
        .executeTakeFirstOrThrow();
    });
  }
  confirm(
    actor: Actor,
    negocioId: string,
    localId: string,
    productoId: string,
    data: CountConfirmDto,
  ) {
    return this.database.tenant(actor, negocioId, async (tx) => {
      await this.context(tx, negocioId, localId);
      await requirePermission(tx, 'inventario.confirmar', localId);
      const current = await tx
        .selectFrom('app.inventario_inicial')
        .selectAll()
        .where('negocio_id', '=', negocioId)
        .where('local_id', '=', localId)
        .where('producto_id', '=', productoId)
        .forUpdate()
        .executeTakeFirstOrThrow();
      // Reintentar la misma confirmación después de una respuesta perdida no duplica nada.
      if (current.estado === 'confirmado' && current.version === data.version + 1) return current;
      if (current.estado === 'confirmado' || current.version !== data.version)
        throw new ConflictException(
          'El conteo cambió; revisa la cantidad guardada antes de confirmar',
        );
      return tx
        .updateTable('app.inventario_inicial')
        .set({ estado: 'confirmado' })
        .where('negocio_id', '=', negocioId)
        .where('local_id', '=', localId)
        .where('producto_id', '=', productoId)
        .returningAll()
        .executeTakeFirstOrThrow();
    });
  }
}

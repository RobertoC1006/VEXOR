import { ConflictException, Injectable } from '@nestjs/common';
import { sql, type Transaction } from 'kysely';
import { DatabaseService, type Actor } from '../../compartido/database/database.service.js';
import { requirePermission, type Database } from '../../compartido/database/database.js';
import { requireLocalAccess } from '../../compartido/autorizacion/authorization.js';
import { requireProductRead } from '../productos/productos.service.js';
import { page } from '../../compartido/http/pagination.js';
import type { CountSaveDto, CountConfirmDto, InventoryQueryDto } from './dto.js';

@Injectable()
export class InventoryService {
  constructor(private readonly database: DatabaseService) {}
  private async context(tx: Transaction<Database>, negocioId: string, localId: string) {
    await requireLocalAccess(tx, localId);
    await tx
      .selectFrom('app.locales')
      .select('id')
      .where('negocio_id', '=', negocioId)
      .where('id', '=', localId)
      .where('activo', '=', true)
      .executeTakeFirstOrThrow();
    await requireProductRead(tx);
  }
  list(actor: Actor, negocioId: string, localId: string, p: InventoryQueryDto) {
    return this.database.tenant(actor, negocioId, async (tx) => {
      await this.context(tx, negocioId, localId);
      const rights = (
        await sql<{ ver: boolean; contar: boolean; confirmar: boolean }>`select
        app_private.puede('inventario.ver', ${localId}::uuid) as ver,
        app_private.puede('inventario.contar', ${localId}::uuid) as contar,
        app_private.puede('inventario.confirmar', ${localId}::uuid) as confirmar`.execute(tx)
      ).rows[0];
      if (!rights.ver && !rights.contar && !rights.confirmar)
        await requirePermission(tx, 'inventario.ver', localId);
      let query = tx
        .selectFrom('app.productos as p')
        .leftJoin('app.inventario_inicial as i', (join) =>
          join
            .onRef('i.negocio_id', '=', 'p.negocio_id')
            .onRef('i.producto_id', '=', 'p.id')
            .on('i.local_id', '=', localId),
        )
        .select([
          'p.id',
          'p.nombre',
          'p.codigo',
          'p.alias',
          'p.activo',
          'i.cantidad',
          'i.referencia',
          'i.confirmado_en',
        ])
        .select(sql<string>`coalesce(i.estado, 'pendiente')`.as('estado'))
        .select(sql<number>`coalesce(i.version, 0)`.as('version'))
        .where('p.nivel_registro', '!=', 'avanzado')
        .select(
          sql<string>`coalesce((select raiz.nombre || ' · ' from app.productos raiz
          where raiz.negocio_id = p.negocio_id and raiz.id = p.producto_padre_id), '') || p.nombre`.as(
            'nombre_completo',
          ),
        )
        .where('p.negocio_id', '=', negocioId);
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
      };
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

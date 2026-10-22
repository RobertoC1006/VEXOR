import { requireInventoryLocal, inventoryRights } from '../inventario/access.js';
import { savePhoto } from './fotos.js';
import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { sql, type Transaction } from 'kysely';
import { DatabaseService, type Actor } from '../../compartido/database/database.service.js';
import { requirePermission, type Database } from '../../compartido/database/database.js';
import { page } from '../../compartido/http/pagination.js';
import { requirePatch } from '../../compartido/http/input.js';
import type { ProductCreateDto, ProductPatchDto, ProductQueryDto } from './dto.js';

export async function requireProductRead(tx: Transaction<Database>) {
  const result = await sql<{ ok: boolean }>`select app_private.puede('productos.ver') or
    app_private.puede('productos.gestionar') as ok`.execute(tx);
  if (!result.rows[0].ok) await requirePermission(tx, 'productos.ver');
}

@Injectable()
export class ProductsService {
  constructor(private readonly database: DatabaseService) {}
  list(actor: Actor, negocioId: string, p: ProductQueryDto, parentId?: string) {
    return this.database.tenant(actor, negocioId, async (tx) => {
      await requireProductRead(tx);
      let query = tx.selectFrom('app.productos').selectAll().where('negocio_id', '=', negocioId);
      if (!parentId)
        query = query
          .select(
            sql<number>`(select count(*)::int from app.productos v where v.negocio_id = app.productos.negocio_id and v.producto_padre_id = app.productos.id)`.as(
              'combinaciones_total',
            ),
          )
          .select(
            sql<
              string | null
            >`(select min(v.precio) from app.productos v where v.negocio_id = app.productos.negocio_id and v.producto_padre_id = app.productos.id)`.as(
              'precio_min',
            ),
          )
          .select(
            sql<
              string | null
            >`(select max(v.precio) from app.productos v where v.negocio_id = app.productos.negocio_id and v.producto_padre_id = app.productos.id)`.as(
              'precio_max',
            ),
          )
          .select(
            sql<number>`(select count(*)::int from app.productos v where v.negocio_id = app.productos.negocio_id and v.producto_padre_id = app.productos.id and v.precio is null)`.as(
              'precios_pendientes',
            ),
          );
      if (p.local_id) {
        await requireInventoryLocal(tx, negocioId, p.local_id);
        await inventoryRights(tx, p.local_id);
        query = query.select(
          sql<{
            cantidad: number | null;
            confirmados: number;
            total: number;
          }>`(select json_build_object(
          'cantidad', case when count(*) > 0 and count(*) = count(i.confirmado_en) then sum(i.cantidad) else null end,
          'confirmados', count(i.confirmado_en), 'total', count(*))
          from app.productos hoja left join app.inventario_inicial i on i.negocio_id = hoja.negocio_id and i.producto_id = hoja.id and i.local_id = ${p.local_id}::uuid
          where hoja.negocio_id = app.productos.negocio_id and (case when app.productos.nivel_registro = 'avanzado' then hoja.producto_padre_id = app.productos.id else hoja.id = app.productos.id end))`.as(
            'stock',
          ),
        );
      }

      if (parentId) {
        await tx
          .selectFrom('app.productos')
          .select('id')
          .where('negocio_id', '=', negocioId)
          .where('id', '=', parentId)
          .executeTakeFirstOrThrow();
        query = query.where('producto_padre_id', '=', parentId);
      } else query = query.where('producto_padre_id', 'is', null);
      if (p.categoria_id)
        query = query.where(sql<boolean>`categoria_id in (
        with recursive categorias as (
          select id from app.categorias where negocio_id = ${negocioId}::uuid and id = ${p.categoria_id}::uuid
          union all select c.id from app.categorias c join categorias superior on c.padre_id = superior.id where c.negocio_id = ${negocioId}::uuid
        ) select id from categorias)`);
      if (p.codigo)
        query = query.where(sql<boolean>`(codigo = ${p.codigo} or exists (
        select 1 from app.productos v where v.negocio_id = ${negocioId}::uuid
        and v.producto_padre_id = app.productos.id and v.codigo = ${p.codigo}))`);
      if (p.q)
        query = query.where(sql<boolean>`(strpos(lower(nombre), lower(${p.q})) > 0 or
        strpos(lower(coalesce(alias, '')), lower(${p.q})) > 0 or codigo = ${p.q} or
        strpos(lower(caracteristicas::text), lower(${p.q})) > 0 or exists (
          select 1 from app.productos v where v.negocio_id = ${negocioId}::uuid
          and v.producto_padre_id = app.productos.id and (v.codigo = ${p.q} or strpos(lower(v.nombre), lower(${p.q})) > 0)))`);
      return page(
        await query
          .orderBy('nombre')
          .orderBy('id')
          .limit(p.limit + 1)
          .offset(p.offset)
          .execute(),
        p,
      );
    });
  }
  get(actor: Actor, negocioId: string, id: string) {
    return this.database.tenant(actor, negocioId, async (tx) => {
      await requireProductRead(tx);
      return tx
        .selectFrom('app.productos')
        .selectAll()
        .where('negocio_id', '=', negocioId)
        .where('id', '=', id)
        .executeTakeFirstOrThrow();
    });
  }
  create(actor: Actor, negocioId: string, data: ProductCreateDto, parentId?: string) {
    return this.database.tenant(actor, negocioId, (tx) =>
      this.createInTransaction(tx, negocioId, data, parentId),
    );
  }
  async createInTransaction(
    tx: Transaction<Database>,
    negocioId: string,
    data: ProductCreateDto,
    parentId?: string,
  ) {
    await requirePermission(tx, 'productos.gestionar');
    if (parentId)
      await tx
        .selectFrom('app.productos')
        .select('id')
        .where('negocio_id', '=', negocioId)
        .where('id', '=', parentId)
        .where('nivel_registro', '=', 'avanzado')
        .where('producto_padre_id', 'is', null)
        .forUpdate()
        .executeTakeFirstOrThrow();
    const { foto, ...fields } = data;
    if (parentId && foto !== undefined)
      throw new BadRequestException('La foto se registra en el modelo');
    const result = await tx
      .insertInto('app.productos')
      .values({
        ...fields,
        foto_version: foto ? 1 : 0,
        caracteristicas: data.caracteristicas ? JSON.stringify(data.caracteristicas) : undefined,
        negocio_id: negocioId,
        producto_padre_id: parentId,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
    await savePhoto(tx, negocioId, result.id, foto);
    return result;
  }
  patch(actor: Actor, negocioId: string, id: string, data: ProductPatchDto) {
    return this.database.tenant(actor, negocioId, (tx) =>
      this.patchInTransaction(tx, negocioId, id, data),
    );
  }
  async patchInTransaction(
    tx: Transaction<Database>,
    negocioId: string,
    id: string,
    data: ProductPatchDto,
    expectedParent?: string | null,
  ) {
    const { version, foto, ...changes } = data;
    requirePatch({ ...changes, ...(foto !== undefined ? { foto } : {}) });
    await requirePermission(tx, 'productos.gestionar');
    let query = tx
      .selectFrom('app.productos')
      .select(['version', 'foto_version', 'producto_padre_id'])
      .where('negocio_id', '=', negocioId)
      .where('id', '=', id);
    if (expectedParent !== undefined)
      query =
        expectedParent === null
          ? query.where('producto_padre_id', 'is', null)
          : query.where('producto_padre_id', '=', expectedParent);
    const current = await query.forUpdate().executeTakeFirstOrThrow();
    if (current.version !== version)
      throw new ConflictException('El producto cambió; actualiza su ficha');
    if (current.producto_padre_id && foto !== undefined)
      throw new BadRequestException('La foto se registra en el modelo');
    const result = await tx
      .updateTable('app.productos')
      .set({
        ...changes,
        ...(foto !== undefined ? { foto_version: foto ? current.foto_version + 1 : 0 } : {}),
        caracteristicas: changes.caracteristicas
          ? JSON.stringify(changes.caracteristicas)
          : undefined,
      })
      .where('negocio_id', '=', negocioId)
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirstOrThrow();
    await savePhoto(tx, negocioId, id, foto);
    return result;
  }
  photo(actor: Actor, negocioId: string, id: string) {
    return this.database.tenant(actor, negocioId, async (tx) => {
      await requireProductRead(tx);
      return tx
        .selectFrom('app.productos as p')
        .leftJoin('app.productos_fotos as f', (join) =>
          join
            .onRef('f.negocio_id', '=', 'p.negocio_id')
            .on(sql<boolean>`f.producto_id = coalesce(p.producto_padre_id, p.id)`),
        )
        .select('f.imagen')
        .where('p.negocio_id', '=', negocioId)
        .where('p.id', '=', id)
        .executeTakeFirstOrThrow();
    });
  }
}

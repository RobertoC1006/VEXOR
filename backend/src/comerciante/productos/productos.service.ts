import { ConflictException, Injectable } from '@nestjs/common';
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
      if (parentId) {
        await tx
          .selectFrom('app.productos')
          .select('id')
          .where('negocio_id', '=', negocioId)
          .where('id', '=', parentId)
          .executeTakeFirstOrThrow();
        query = query.where('producto_padre_id', '=', parentId);
      } else query = query.where('producto_padre_id', 'is', null);
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
    return this.database.tenant(actor, negocioId, async (tx) => {
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
      return tx
        .insertInto('app.productos')
        .values({
          ...data,
          caracteristicas: data.caracteristicas ? JSON.stringify(data.caracteristicas) : undefined,
          negocio_id: negocioId,
          producto_padre_id: parentId,
        })
        .returningAll()
        .executeTakeFirstOrThrow();
    });
  }
  patch(actor: Actor, negocioId: string, id: string, data: ProductPatchDto) {
    const { version, ...changes } = data;
    requirePatch(changes);
    return this.database.tenant(actor, negocioId, async (tx) => {
      await requirePermission(tx, 'productos.gestionar');
      const current = await tx
        .selectFrom('app.productos')
        .select('version')
        .where('negocio_id', '=', negocioId)
        .where('id', '=', id)
        .forUpdate()
        .executeTakeFirstOrThrow();
      if (current.version !== version)
        throw new ConflictException('El producto cambió; actualiza su ficha');
      return tx
        .updateTable('app.productos')
        .set({
          ...changes,
          caracteristicas: changes.caracteristicas
            ? JSON.stringify(changes.caracteristicas)
            : undefined,
        })
        .where('negocio_id', '=', negocioId)
        .where('id', '=', id)
        .returningAll()
        .executeTakeFirstOrThrow();
    });
  }
}

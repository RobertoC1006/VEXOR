import { Injectable, NotFoundException } from '@nestjs/common';
import { sql } from 'kysely';
import { DatabaseService, type Actor } from '../../compartido/database/database.service.js';
import { requirePermission } from '../../compartido/database/database.js';
import { page } from '../../compartido/http/pagination.js';
import { posOperation } from './pos-operation.js';
import type { CartQueryDto, CartSaveDto } from './carritos.dto.js';
@Injectable()
export class CartsService {
  constructor(private readonly database: DatabaseService) {}
  get(actor: Actor, n: string, id: string) {
    return this.database.tenant(actor, n, async (tx) => {
      const row = (
        await sql`select * from app.ventas_carritos where negocio_id=${n}::uuid and id=${id}::uuid and estado='espera'`.execute(
          tx,
        )
      ).rows[0];
      if (!row) throw new NotFoundException('El carrito ya no está en espera o no tienes acceso');
      return row;
    });
  }
  list(actor: Actor, n: string, q: CartQueryDto) {
    return this.database.tenant(actor, n, async (tx) => {
      await requirePermission(tx, 'ventas.cobrar', q.local_id);
      const rows = (
        await sql`select c.id,c.local_id,c.nombre,c.version,c.contenido,c.creado_en,c.actualizado_en,
        (select jsonb_agg(jsonb_build_object('producto_id',p.id,'nombre',p.nombre,'modelo_nombre',coalesce(r.nombre,p.nombre),'presentacion_id',x->>'presentacion_id','presentacion',coalesce(pr.nombre,'Unidad')))
        from jsonb_array_elements(c.contenido->'lineas') x
        join app.productos p on p.negocio_id=c.negocio_id and p.id=(x->>'producto_id')::uuid
        left join app.productos r on r.negocio_id=p.negocio_id and r.id=p.producto_padre_id
        left join app.presentaciones pr on pr.negocio_id=p.negocio_id and pr.id=(x->>'presentacion_id')::uuid) resumen
        from app.ventas_carritos c where c.negocio_id=${n}::uuid and c.local_id=${q.local_id}::uuid and c.estado='espera' and (${q.excluir_id ?? null}::uuid is null or c.id<>${q.excluir_id ?? null}::uuid)
        order by c.creado_en,c.id limit ${q.limit + 1} offset ${q.offset}`.execute(tx)
      ).rows;
      const total = (
        await sql<{
          cantidad: number;
        }>`select count(*)::int cantidad from app.ventas_carritos where negocio_id=${n}::uuid and local_id=${q.local_id}::uuid and estado='espera' and (${q.excluir_id ?? null}::uuid is null or id<>${q.excluir_id ?? null}::uuid)`.execute(
          tx,
        )
      ).rows[0].cantidad;
      const demanda = (
        await sql`select p.id producto_id,coalesce(r.nombre,p.nombre) nombre,
        sum((x->>'cantidad')::bigint*(x->>'unidades_esperadas')::bigint)::text cantidad,
        i.cantidad disponible,i.estado
        from app.ventas_carritos c cross join lateral jsonb_array_elements(c.contenido->'lineas') x
        join app.productos p on p.negocio_id=c.negocio_id and p.id=(x->>'producto_id')::uuid
        left join app.productos r on r.negocio_id=p.negocio_id and r.id=p.producto_padre_id
        left join app.existencias i on i.negocio_id=c.negocio_id and i.local_id=c.local_id and i.producto_id=p.id
        where c.negocio_id=${n}::uuid and c.local_id=${q.local_id}::uuid and c.estado='espera' and (${q.excluir_id ?? null}::uuid is null or c.id<>${q.excluir_id ?? null}::uuid)
        group by p.id,p.nombre,r.nombre,i.cantidad,i.estado`.execute(tx)
      ).rows;
      return { ...page(rows, q), total, demanda };
    });
  }
  save(actor: Actor, n: string, id: string, d: CartSaveDto) {
    return this.database.tenant(actor, n, (tx) =>
      posOperation(
        async () =>
          (
            await sql`select * from app_private.guardar_carrito(${n}::uuid,${d.local_id}::uuid,${id}::uuid,${d.version},${d.nombre ?? `Carrito ${id.slice(0, 6).toUpperCase()}`},${JSON.stringify({ lineas: d.lineas, descuento: d.descuento })}::jsonb)`.execute(
              tx,
            )
          ).rows[0],
      ),
    );
  }
  discard(actor: Actor, n: string, id: string, version: number) {
    return this.database.tenant(actor, n, (tx) =>
      posOperation(
        async () =>
          (
            await sql`select * from app_private.descartar_carrito(${n}::uuid,${id}::uuid,${version})`.execute(
              tx,
            )
          ).rows[0],
      ),
    );
  }
}

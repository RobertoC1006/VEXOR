import { posOperation } from './pos-operation.js';
import { BadRequestException, Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import { DatabaseService, type Actor } from '../../compartido/database/database.service.js';
import { requirePermission } from '../../compartido/database/database.js';
import { requireOwner } from '../../compartido/autorizacion/authorization.js';
import { page } from '../../compartido/http/pagination.js';
import type { PolicyDto, PosQueryDto, PresentationDto, SaleDto } from './dto.js';

@Injectable()
export class SalesService {
  constructor(private readonly database: DatabaseService) {}
  setup(actor: Actor, negocioId: string) {
    return this.database.tenant(actor, negocioId, async (tx) => {
      const locales = (
        await sql`select id,nombre,app_private.puede('ventas.descontar',id) descontar from app.locales where negocio_id=${negocioId}::uuid and activo and habilitado_venta and app_private.accede_local(id) and app_private.puede('ventas.cobrar',id) order by nombre,id`.execute(
          tx,
        )
      ).rows;
      const politica = (
        await sql`select coalesce((select limite_descuento from app.ventas_politicas where negocio_id=${negocioId}::uuid),0)::text limite_descuento,app_private.es_propietario() propietario`.execute(
          tx,
        )
      ).rows[0];
      return { locales, politica };
    });
  }
  catalog(actor: Actor, negocioId: string, q: PosQueryDto) {
    return this.database.tenant(actor, negocioId, async (tx) => {
      await requirePermission(tx, 'ventas.cobrar', q.local_id);
      const rows = (
        await sql`select p.id,p.nombre,p.codigo,p.precio,p.producto_padre_id,p.caracteristicas,
        coalesce(r.nombre,p.nombre) modelo_nombre,coalesce(r.foto_version,p.foto_version) foto_version,
        coalesce(r.id,p.id) foto_id,(select pr.id from app.presentaciones pr where pr.negocio_id=p.negocio_id and pr.producto_id=p.id and pr.activo and pr.codigo=${q.codigo ?? null}) presentacion_escaneada,i.cantidad stock,i.estado,m.minimo,
        coalesce((select jsonb_agg(jsonb_build_object('id',pr.id,'nombre',pr.nombre,'codigo',pr.codigo,'unidades',pr.unidades,'precio',pr.precio::text) order by pr.nombre,pr.id) from app.presentaciones pr where pr.negocio_id=p.negocio_id and pr.producto_id=p.id and pr.activo),'[]') presentaciones
        from app.productos p left join app.productos r on r.negocio_id=p.negocio_id and r.id=p.producto_padre_id
        left join app.existencias i on i.negocio_id=p.negocio_id and i.producto_id=p.id and i.local_id=${q.local_id}::uuid
        left join app.stock_minimos m on m.negocio_id=p.negocio_id and m.producto_id=p.id and m.local_id=${q.local_id}::uuid
        where p.negocio_id=${negocioId}::uuid and p.activo and p.nivel_registro<>'avanzado' and (p.producto_padre_id is null or r.activo)
        and (${q.ids ?? null}::uuid[] is null or p.id=any(${q.ids ?? []}::uuid[]))
        and (${q.codigo ?? null}::text is null or p.codigo=${q.codigo ?? null} or r.codigo=${q.codigo ?? null} or exists(select 1 from app.presentaciones pr where pr.negocio_id=p.negocio_id and pr.producto_id=p.id and pr.activo and pr.codigo=${q.codigo ?? null}))
        and (${q.buscar ?? ''}='' or concat_ws(' ',p.nombre,p.alias,p.codigo,r.nombre,r.alias,p.caracteristicas::text) ilike ${'%' + (q.buscar ?? '') + '%'})
        order by coalesce(r.nombre,p.nombre),p.nombre,p.id limit ${q.limit + 1} offset ${q.offset}`.execute(
          tx,
        )
      ).rows;
      return page(rows, q);
    });
  }
  charge(actor: Actor, negocioId: string, d: SaleDto) {
    return this.database.tenant(actor, negocioId, async (tx) => {
      const { operacion_id, local_id, ...body } = d;
      return posOperation(
        async () =>
          (
            await sql`select * from app_private.cobrar_venta(${negocioId}::uuid,${local_id}::uuid,${operacion_id}::uuid,${JSON.stringify(body)}::jsonb)`.execute(
              tx,
            )
          ).rows[0],
      );
    });
  }
  history(actor: Actor, negocioId: string, q: PosQueryDto) {
    return this.database.tenant(actor, negocioId, async (tx) => {
      await requirePermission(tx, 'ventas.cobrar', q.local_id);
      const rows = (
        await sql`select v.id,v.operacion_id,v.total,v.subtotal,v.descuento,v.pagos,v.efectivo_recibido,v.vuelto,v.creado_en,
        (select jsonb_agg(jsonb_build_object('nombre',vl.nombre,'presentacion',vl.presentacion,'cantidad',vl.cantidad,'precio',vl.precio::text)) from app.ventas_lineas vl where vl.negocio_id=v.negocio_id and vl.venta_id=v.id) lineas
        from app.ventas v where v.negocio_id=${negocioId}::uuid and v.local_id=${q.local_id}::uuid order by v.creado_en desc,v.id limit ${q.limit + 1} offset ${q.offset}`.execute(
          tx,
        )
      ).rows;
      return page(rows, q);
    });
  }
  policy(actor: Actor, negocioId: string, d: PolicyDto) {
    return this.database.tenant(actor, negocioId, async (tx) => {
      await requireOwner(tx);
      return (
        await sql`insert into app.ventas_politicas(negocio_id,limite_descuento) values(${negocioId}::uuid,${d.limite_descuento}::numeric) on conflict(negocio_id) do update set limite_descuento=excluded.limite_descuento returning limite_descuento`.execute(
          tx,
        )
      ).rows[0];
    });
  }
  presentation(actor: Actor, negocioId: string, d: PresentationDto) {
    return this.database.tenant(actor, negocioId, async (tx) => {
      await requirePermission(tx, 'productos.gestionar');
      const product = await tx
        .selectFrom('app.productos')
        .select('id')
        .where('negocio_id', '=', negocioId)
        .where('id', '=', d.producto_id)
        .where('activo', '=', true)
        .where('nivel_registro', '!=', 'avanzado')
        .executeTakeFirst();
      if (!product) throw new BadRequestException('Elige un producto o combinación activa');
      return (
        await sql`insert into app.presentaciones(negocio_id,producto_id,nombre,unidades,precio,codigo) values(${negocioId}::uuid,${d.producto_id}::uuid,${d.nombre},${d.unidades},${d.precio}::numeric,${d.codigo ?? null}) returning *`.execute(
          tx,
        )
      ).rows[0];
    });
  }
  editPresentation(actor: Actor, negocioId: string, id: string, d: PresentationDto) {
    return this.database.tenant(actor, negocioId, async (tx) => {
      await requirePermission(tx, 'productos.gestionar');
      const result = (
        await sql`update app.presentaciones set codigo=${d.codigo ?? null},nombre=${d.nombre},unidades=${d.unidades},precio=${d.precio}::numeric,activo=${d.activo ?? true} where negocio_id=${negocioId}::uuid and id=${id}::uuid and producto_id=${d.producto_id}::uuid returning *`.execute(
          tx,
        )
      ).rows[0];
      if (!result) throw new BadRequestException('Presentación no disponible');
      return result;
    });
  }
}

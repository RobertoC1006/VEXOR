import { Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import { DatabaseService, type Actor } from '../../compartido/database/database.service.js';
import { stockAlert } from '../inventario/queries.js';
export interface LocalSummary {
  id: string;
  nombre: string;
  habilitado_venta: boolean;
  total: number;
  confirmados: number;
  unidades: number;
  alertas: number;
  sin_minimo: number;
}
export interface AlertSummary {
  id: string;
  nombre: string;
  modelo_nombre: string | null;
  local_id: string;
  local_nombre: string;
  cantidad: number;
  minimo: number;
  foto_version: number;
}
export interface Recent {
  tipo: 'producto' | 'conteo';
  id: string;
  nombre: string;
  local_id: string | null;
  local_nombre: string | null;
  fecha: string;
}
@Injectable()
export class SummaryService {
  constructor(private readonly database: DatabaseService) {}
  summary(actor: Actor, negocioId: string) {
    return this.database.tenant(actor, negocioId, async (tx) => {
      const permissions = (
        await sql<{
          productos: boolean;
        }>`select app_private.puede('productos.ver') or app_private.puede('productos.gestionar') as productos`.execute(
          tx,
        )
      ).rows[0];
      if (!permissions.productos)
        return { catalogo: null, locales: [], alertas: [], actividad: [] };
      const catalogo = (
        await sql<{ productos: number; combinaciones: number }>`select
    count(*) filter(where p.producto_padre_id is null)::int as productos,
    count(*) filter(where p.producto_padre_id is not null)::int as combinaciones
    from app.productos p where p.negocio_id=${negocioId}::uuid and p.activo and
    (p.producto_padre_id is null or exists(select 1 from app.productos raiz where raiz.negocio_id=p.negocio_id and raiz.id=p.producto_padre_id and raiz.activo))`.execute(
          tx,
        )
      ).rows[0];
      const locales = (
        await sql<LocalSummary>`select l.id,l.nombre,l.habilitado_venta,
    count(p.id)::int as total,count(i.confirmado_en)::int as confirmados,
    coalesce(sum(i.cantidad) filter(where i.confirmado_en is not null),0)::float8 as unidades,
    count(p.id) filter(where ${stockAlert()})::int as alertas,
    count(p.id) filter(where i.confirmado_en is not null and m.minimo is null)::int as sin_minimo
    from app.locales l left join app.productos p on p.negocio_id=l.negocio_id and p.activo and p.nivel_registro<>'avanzado'
    and (p.producto_padre_id is null or exists(select 1 from app.productos raiz where raiz.negocio_id=p.negocio_id and raiz.id=p.producto_padre_id and raiz.activo))
    left join app.existencias i on i.negocio_id=p.negocio_id and i.producto_id=p.id and i.local_id=l.id
    left join app.stock_minimos m on m.negocio_id=p.negocio_id and m.producto_id=p.id and m.local_id=l.id
    where l.negocio_id=${negocioId}::uuid and l.activo and app_private.accede_local(l.id) and
    (app_private.puede('inventario.ver',l.id) or app_private.puede('inventario.contar',l.id) or app_private.puede('inventario.confirmar',l.id))
    group by l.id,l.nombre,l.habilitado_venta order by l.nombre,l.id`.execute(tx)
      ).rows;
      const localIds = locales.map((l) => l.id);
      const alertas = localIds.length
        ? (
            await sql<AlertSummary>`select p.id,p.nombre,raiz.nombre as modelo_nombre,l.id as local_id,l.nombre as local_nombre,i.cantidad,m.minimo,coalesce(raiz.foto_version,p.foto_version) as foto_version
    from app.productos p join app.existencias i on i.negocio_id=p.negocio_id and i.producto_id=p.id
    join app.locales l on l.negocio_id=p.negocio_id and l.id=i.local_id
    join app.stock_minimos m on m.negocio_id=p.negocio_id and m.producto_id=p.id and m.local_id=l.id
    left join app.productos raiz on raiz.negocio_id=p.negocio_id and raiz.id=p.producto_padre_id
    where p.negocio_id=${negocioId}::uuid and p.activo and (p.producto_padre_id is null or raiz.activo) and l.id=any(${localIds}::uuid[]) and ${stockAlert()}
    order by (i.cantidad::float8/m.minimo),p.nombre,l.nombre,p.id limit 5`.execute(tx)
          ).rows
        : [];
      const actividad = (
        await sql<Recent>`select * from (
    select 'producto'::text as tipo,p.id,p.nombre,null::uuid as local_id,null::text as local_nombre,p.actualizado_en as fecha
    from app.productos p where p.negocio_id=${negocioId}::uuid and p.producto_padre_id is null
    union all select 'conteo'::text,p.id,coalesce(raiz.nombre || ' · ','') || p.nombre,l.id,l.nombre,i.confirmado_en
    from app.existencias i join app.productos p on p.negocio_id=i.negocio_id and p.id=i.producto_id
    left join app.productos raiz on raiz.negocio_id=p.negocio_id and raiz.id=p.producto_padre_id
    join app.locales l on l.negocio_id=i.negocio_id and l.id=i.local_id
    where i.negocio_id=${negocioId}::uuid and i.confirmado_en is not null and l.id=any(${localIds}::uuid[])
   ) cambios order by fecha desc,id limit 5`.execute(tx)
      ).rows;
      return { catalogo, locales, alertas, actividad };
    });
  }
}

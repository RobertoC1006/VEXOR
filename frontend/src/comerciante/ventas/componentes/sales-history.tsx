import { api } from '../../../compartido/api/api';
import { useResource } from '../../../compartido/api/use-resource';
import { Modal } from '../../../compartido/componentes/modal';
import { ResourceState } from '../../../compartido/componentes/feedback';
import { Pagination, usePageState } from '../../../compartido/componentes/pagination';
import { useBusiness } from '../../negocio/context';
import type { Page } from '../../../compartido/tipos/types';
import type { Sale } from '../types';
import { cents, soles } from '../amounts';
export function SalesHistory({ local, onClose }: { local: string; onClose: () => void }) {
  const { base, business } = useBusiness(),
    p = usePageState(local);
  const url = `${base}/ventas?local_id=${local}&limit=${p.pageSize}&offset=${p.offset}`;
  const resource = useResource(url, (signal) => api<Page<Sale>>(url, { signal }));
  return (
    <Modal label="Ventas registradas" onClose={onClose}>
      {!resource.data ? (
        <ResourceState error={resource.error} retry={resource.refresh} />
      ) : (
        <div className="pos-form">
          {!resource.data.items.length && <p>Aún no hay ventas en este puesto.</p>}
          {resource.data.items.map((s) => (
            <article key={s.id} className="pos-history-sale">
              <div>
                <strong>{soles(cents(s.total)!)}</strong>
                <time>
                  {new Date(s.creado_en).toLocaleString('es-PE', {
                    timeZone: business.zona_horaria,
                  })}
                </time>
              </div>
              <small>
                Venta {s.id.slice(0, 8)} · Descuento {soles(cents(s.descuento)!)}
              </small>
              {s.lineas?.map((l, i) => (
                <p key={i}>
                  {l.cantidad} × {l.nombre} · {l.presentacion}
                </p>
              ))}
              <small>
                Efectivo {soles(cents(s.pagos.efectivo)!)} · Yape {soles(cents(s.pagos.yape)!)} ·
                Plin {soles(cents(s.pagos.plin)!)}
              </small>
            </article>
          ))}
          <Pagination
            offset={p.offset}
            pageSize={p.pageSize}
            more={!!resource.data.has_more}
            onChange={p.setOffset}
            onPageSize={p.setPageSize}
          />
        </div>
      )}
    </Modal>
  );
}

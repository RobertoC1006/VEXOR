import { useState } from 'react';
import { api } from '../../../compartido/api/api';
import { useResource } from '../../../compartido/api/use-resource';
import { usePageState, Pagination } from '../../../compartido/componentes/pagination';
import { Button, Empty } from '../../../compartido/componentes/ui';
import { ResourceState } from '../../../compartido/componentes/feedback';
import { Modal } from '../../../compartido/componentes/modal';
import { useBusiness } from '../../negocio/context';
import { StockOperationForm } from './stock-operation-form';
import type { Movement, StockLocal } from '../stock-types';
import type { Page } from '../../../compartido/tipos/types';
export function StockActivity({
  local,
  locals,
  productId,
  onChanged,
}: {
  local: StockLocal;
  locals: StockLocal[];
  productId?: string;
  onChanged: () => Promise<unknown>;
}) {
  const { base } = useBusiness();
  const [tab, setTab] = useState('traslados');
  const [receipt, setReceipt] = useState<Movement | null>(null);
  const paging = usePageState(`${tab}:${local.id}:${productId}`);
  const path = `${base}/locales/${local.id}/${tab}?limit=${paging.pageSize}&offset=${paging.offset}${productId ? `&producto_id=${productId}` : ''}`;
  const resource = useResource(path, (s) => api<Page<Movement>>(path, { signal: s }));
  return (
    <section className="stock-activity" aria-label="Movimientos de inventario">
      <div className="detail-tabs" role="group" aria-label="Tipo de movimiento">
        {['traslados', 'movimientos'].map((t) => (
          <button type="button" key={t} aria-pressed={tab === t} onClick={() => setTab(t)}>
            {t === 'traslados' ? 'Traslados' : 'Historial del local'}
          </button>
        ))}
      </div>
      {!resource.data ? (
        <ResourceState error={resource.error} retry={resource.refresh} />
      ) : (
        <>
          <Pagination
            offset={paging.offset}
            pageSize={paging.pageSize}
            more={resource.data.has_more ?? false}
            onChange={paging.setOffset}
            onPageSize={paging.setPageSize}
            total={resource.data.has_more ? undefined : paging.offset + resource.data.items.length}
          />
          {!resource.data.items.length && (
            <Empty
              title={
                tab === 'traslados' ? 'Sin traslados registrados' : 'Sin movimientos registrados'
              }
            >
              Las operaciones aparecerán aquí con su fecha y motivo.
            </Empty>
          )}
          <div className="movement-list">
            {resource.data.items.map((m) => (
              <article key={m.id}>
                <div>
                  <strong>{m.nombre}</strong>
                  <p>
                    {m.tipo === 'salida'
                      ? `${locals.find((l) => l.id === m.local_id)?.nombre ?? 'Origen'} → ${locals.find((l) => l.id === m.destino_id)?.nombre ?? 'Destino'}`
                      : m.tipo === 'ajuste'
                        ? 'Ajuste de existencias'
                        : m.tipo === 'venta'
                          ? 'Venta POS'
                          : 'Recepción de traslado'}
                  </p>
                  <small>
                    {new Date(m.creado_en).toLocaleString('es-PE')} · {m.motivo}
                  </small>
                </div>
                <div className="movement-quantity">
                  <strong>
                    {m.tipo === 'ajuste' && m.cantidad > 0
                      ? '+'
                      : m.tipo === 'venta' || m.tipo === 'salida'
                        ? '−'
                        : ''}
                    {m.cantidad} unid.
                  </strong>
                  {m.tipo === 'salida' && (
                    <>
                      <span
                        className={`badge ${m.recibidas === m.cantidad ? 'success' : 'neutral'}`}
                      >
                        {m.cantidad - m.recibidas
                          ? `${m.cantidad - m.recibidas} en tránsito`
                          : 'Recibido'}
                      </span>
                      <small>
                        {m.recibidas} recibidas de {m.cantidad}
                      </small>
                    </>
                  )}
                  {m.tipo === 'salida' &&
                    m.destino_id === local.id &&
                    local.recibir &&
                    m.recibidas < m.cantidad && (
                      <Button variant="secondary" onClick={() => setReceipt(m)}>
                        Recibir unidades
                      </Button>
                    )}
                </div>
              </article>
            ))}
          </div>
        </>
      )}
      {receipt && (
        <Modal label="Recibir traslado" onClose={() => setReceipt(null)}>
          <StockOperationForm
            operation={{ tipo: 'recepcion', movement: receipt, local }}
            locals={locals}
            onSaved={async () => {
              await resource.refresh();
              await onChanged();
              setReceipt(null);
            }}
          />
        </Modal>
      )}
    </section>
  );
}

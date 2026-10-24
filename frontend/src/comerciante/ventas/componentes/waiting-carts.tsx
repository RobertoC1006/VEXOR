import { Clock3, RefreshCw } from 'lucide-react';
import { Modal } from '../../../compartido/componentes/modal';
import { Button, Notice } from '../../../compartido/componentes/ui';
import { ResourceState } from '../../../compartido/componentes/feedback';
import { Pagination } from '../../../compartido/componentes/pagination';
import { waitingTotal } from '../cart-content';
import { soles } from '../amounts';
import type { useHeldCarts } from '../use-held-carts';
export function WaitingCarts({
  held,
  hasCurrent,
  onClose,
}: {
  held: ReturnType<typeof useHeldCarts>;
  hasCurrent: boolean;
  onClose: () => void;
}) {
  const { resource, pagination: p } = held;
  return (
    <Modal label="Carritos en espera" onClose={onClose} busy={held.busy}>
      <div className="pos-form">
        <div className="pos-waiting-heading">
          <p>Compartidos en este puesto. No reservan stock ni registran cobros.</p>
          <Button
            variant="secondary"
            disabled={held.busy || resource.loading}
            onClick={() => void resource.refresh()}
          >
            <RefreshCw size={18} />
            Actualizar
          </Button>
        </div>
        {held.error && <Notice>{held.error}</Notice>}
        {!resource.data ? (
          <ResourceState error={resource.error} retry={resource.refresh} />
        ) : (
          <>
            {!resource.data.items.length && <p>No hay carritos en espera en este puesto.</p>}
            {resource.data.items.map((cart) => (
              <article key={cart.id} className="pos-waiting-card">
                <div className="pos-waiting-heading">
                  <h3>
                    <Clock3 size={18} />
                    {cart.nombre}
                  </h3>
                  <strong>
                    {waitingTotal(cart) < 0 ? 'Revisar total' : soles(waitingTotal(cart))}
                  </strong>
                </div>
                <small>
                  {new Date(cart.creado_en).toLocaleTimeString('es-PE', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}{' '}
                  · Total al guardar
                </small>
                <p>
                  {cart.contenido.lineas.map((line, index) => {
                    const info = cart.resumen?.find(
                      (p) =>
                        p.producto_id === line.producto_id &&
                        (p.presentacion_id ?? null) === (line.presentacion_id ?? null),
                    );
                    return `${line.cantidad} × ${info?.modelo_nombre ?? info?.nombre ?? 'Producto'}${info?.nombre && info.nombre !== info.modelo_nombre ? ' / ' + info.nombre : ''}${line.presentacion_id ? ' / ' + (info?.presentacion ?? 'Presentación') : ''}${index < cart.contenido.lineas.length - 1 ? ' · ' : ''}`;
                  })}
                </p>
                <Button
                  aria-label={`Retomar ${cart.nombre}`}
                  disabled={held.busy || held.active?.id === cart.id}
                  variant="secondary"
                  onClick={async () => {
                    if (await held.resume(cart)) onClose();
                  }}
                >
                  {held.active?.id === cart.id
                    ? 'En atención aquí'
                    : hasCurrent
                      ? 'Guardar actual y retomar'
                      : 'Retomar carrito'}
                </Button>
              </article>
            ))}
            <Pagination
              offset={p.offset}
              pageSize={p.pageSize}
              total={resource.data.total}
              more={!!resource.data.has_more}
              loading={held.busy || resource.loading}
              onChange={p.setOffset}
              onPageSize={p.setPageSize}
            />
          </>
        )}
        {held.active && hasCurrent && (
          <Button
            variant="ghost"
            disabled={held.busy}
            onClick={async () => {
              if (await held.hold(true)) onClose();
            }}
          >
            Guardar mis cambios como otro carrito
          </Button>
        )}
      </div>
    </Modal>
  );
}

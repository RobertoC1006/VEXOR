import { useState, useId } from 'react';
import { Modal } from '../../../compartido/componentes/modal';
import { Button } from '../../../compartido/componentes/ui';
import { ProductPhoto } from './product-photo';
import { VariantsContent } from './variants-panel';
import { StockGauge } from '../../inventario/componentes/stock-gauge';
import { catalogPrice, priceLabel, type Product } from '../types';
import { useBusiness } from '../../negocio/context';
export function ProductDetail({
  product,
  localName,
  onClose,
  onEdit,
}: {
  product: Product;
  localName?: string;
  onClose: () => void;
  onEdit: () => void;
}) {
  const tabsId = useId();
  const { can } = useBusiness();
  const [tab, setTab] = useState('info');
  return (
    <Modal label={`Detalle de ${product.nombre}`} onClose={onClose}>
      <div className="product-detail-hero">
        <ProductPhoto id={product.id} version={product.foto_version} name={product.nombre} />
        <div>
          <h2>{product.nombre}</h2>
          <p className="muted">
            {product.codigo ?? 'Sin código'} · {product.activo ? 'Activo' : 'Pausado'}
          </p>
        </div>
        {can('productos.gestionar') && (
          <Button variant="secondary" onClick={onEdit}>
            Editar {product.nivel_registro === 'avanzado' ? 'modelo' : 'producto'}
          </Button>
        )}
      </div>
      <div
        className="detail-tabs"
        role="tablist"
        aria-label="Detalle del producto"
        onKeyDown={(e) => {
          if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
            e.preventDefault();
            const tabs = Array.from(
              e.currentTarget.querySelectorAll<HTMLButtonElement>('[role=tab]'),
            );
            const index = tabs.indexOf(document.activeElement as HTMLButtonElement);
            const next =
              e.key === 'Home'
                ? 0
                : e.key === 'End'
                  ? tabs.length - 1
                  : (index + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
            tabs[next]?.click();
            tabs[next]?.focus();
          }
        }}
      >
        <button
          type="button"
          role="tab"
          id={`${tabsId}-info`}
          aria-controls={`${tabsId}-panel`}
          tabIndex={tab === 'info' ? 0 : -1}
          aria-selected={tab === 'info'}
          onClick={() => setTab('info')}
        >
          Información
        </button>
        {product.nivel_registro === 'avanzado' && (
          <button
            type="button"
            role="tab"
            id={`${tabsId}-combinations`}
            aria-controls={`${tabsId}-panel`}
            tabIndex={tab === 'combinations' ? 0 : -1}
            aria-selected={tab === 'combinations'}
            onClick={() => setTab('combinations')}
          >
            Combinaciones ({product.combinaciones_total ?? 0})
          </button>
        )}
      </div>
      <section role="tabpanel" id={`${tabsId}-panel`} aria-labelledby={`${tabsId}-${tab}`}>
        {tab === 'combinations' ? (
          <VariantsContent parent={product} onEdit={onEdit} />
        ) : (
          <>
            <div className="detail-summary">
              <div>
                <small>Precio</small>
                <strong>{catalogPrice(product)}</strong>
              </div>
              <div>
                <small>Costo</small>
                <strong>
                  {product.nivel_registro === 'avanzado'
                    ? 'Por combinación'
                    : product.costo === null
                      ? 'Costo pendiente'
                      : priceLabel(product.costo)}
                </strong>
              </div>
              <div>
                <small>{localName ? `Stock en ${localName}` : 'Stock'}</small>
                <StockGauge
                  lowCount={product.nivel_registro === 'avanzado' ? product.stock?.bajos : 0}
                  quantity={product.stock?.cantidad ?? null}
                  minimum={product.stock?.minimo ?? null}
                  hint={
                    product.stock?.cantidad === null && product.stock.confirmados
                      ? `Conteo parcial: ${product.stock.confirmados}/${product.stock.total}`
                      : undefined
                  }
                />
              </div>
            </div>
            {product.descripcion && <p>{product.descripcion}</p>}
            <dl className="product-facts">
              {product.caracteristicas.map((a) => (
                <div key={a.nombre}>
                  <dt>{a.nombre}</dt>
                  <dd>{a.valor}</dd>
                </div>
              ))}
            </dl>
            {product.nivel_registro === 'avanzado' && (
              <p className="field-hint">
                Este modelo agrupa sus combinaciones. Cada talla o color tiene su propio conteo y
                mínimo por local.
              </p>
            )}
          </>
        )}
      </section>
    </Modal>
  );
}

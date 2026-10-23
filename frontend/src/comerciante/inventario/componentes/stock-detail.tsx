import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRightLeft, SlidersHorizontal } from 'lucide-react';
import { api } from '../../../compartido/api/api';
import { useResource } from '../../../compartido/api/use-resource';
import { Modal } from '../../../compartido/componentes/modal';
import { Button, Notice } from '../../../compartido/componentes/ui';
import { ResourceState } from '../../../compartido/componentes/feedback';
import { ChoicePicker } from '../../../compartido/componentes/choice-picker';
import { ClientPager, useClientPage } from '../../../compartido/componentes/pagination';
import { useBusiness } from '../../negocio/context';
import { ProductPhoto } from '../../productos/componentes/product-photo';
import { StockGauge } from './stock-gauge';
import { StockMatrix } from './stock-matrix';
import { StockActivity } from './stock-activity';
import { StockOperationForm } from './stock-operation-form';
import { inventoryLink } from '../navigation';
import type { StockDetail as Detail, StockAction } from '../stock-types';

export function StockDetail({
  productId,
  localId,
  onClose,
  onChanged,
}: {
  productId: string;
  localId: string;
  onClose: () => void;
  onChanged: () => Promise<unknown>;
}) {
  const { base } = useBusiness();
  const path = `${base}/inventario/productos/${productId}`;
  const resource = useResource(path, (s) => api<Detail>(path, { signal: s }));
  return (
    <Modal label="Inventario por puesto / almacén" onClose={onClose}>
      {resource.data ? (
        <StockDetailContent
          data={resource.data}
          initialLocal={localId}
          onChanged={async () => {
            await resource.refresh();
            await onChanged();
          }}
        />
      ) : (
        <ResourceState error={resource.error} retry={resource.refresh} />
      )}
    </Modal>
  );
}
function StockDetailContent({
  data,
  initialLocal,
  onChanged,
}: {
  data: Detail;
  initialLocal: string;
  onChanged: () => Promise<unknown>;
}) {
  const { base } = useBusiness();
  const [localId, setLocal] = useState(initialLocal);
  const [selected, setSelected] = useState(
    data.seleccionado === data.producto.id && data.producto.nivel_registro === 'avanzado'
      ? ''
      : data.seleccionado,
  );
  const [operation, setOperation] = useState<StockAction | null>(null);
  const [history, setHistory] = useState(false);
  const page = useClientPage(data.locales);
  const local = data.locales.find((l) => l.id === localId) ?? data.locales[0];
  const variant = data.combinaciones.find((p) => p.id === selected);
  const variants = variant ? [variant] : data.combinaciones;
  const entries = (id: string) =>
    variants.map((p) => data.existencias.find((s) => s.local_id === id && s.producto_id === p.id));
  const balance = (id: string) => {
    const stock = entries(id);
    return stock.length && stock.every((s) => s?.estado === 'confirmado' && s.cantidad !== null)
      ? stock.reduce((n, s) => n + s!.cantidad!, 0)
      : null;
  };
  const minimum = (id: string) => {
    const stock = entries(id);
    return stock.length && stock.every((s) => s?.minimo != null)
      ? stock.reduce((n, s) => n + s!.minimo!, 0)
      : null;
  };
  const known = data.locales.length > 0 && data.locales.every((l) => balance(l.id) !== null);
  const total = known ? data.locales.reduce((n, l) => n + balance(l.id)!, 0) : null;
  const transit = data.transitos
    .filter((t) => !variant || t.producto_id === variant.id)
    .reduce((n, t) => n + t.cantidad, 0);
  const current = local ? balance(local.id) : null;
  const selectedProduct = variant ?? data.producto;
  return (
    <div className="inventory-detail">
      <div className="location-tabs" role="group" aria-label="Local del detalle">
        {page.items.map((l) => (
          <button
            key={l.id}
            type="button"
            aria-pressed={local?.id === l.id}
            onClick={() => setLocal(l.id)}
          >
            {l.nombre}
            {l.habilitado_venta ? '' : ' · Almacén'}
          </button>
        ))}
      </div>
      <ClientPager page={page} />
      <header className="inventory-hero">
        <ProductPhoto
          id={data.producto.id}
          version={data.producto.foto_version}
          name={data.producto.nombre}
        />
        <div>
          <h2>{data.producto.nombre}</h2>
          <p className="muted">
            {selectedProduct.codigo ? `Código: ${selectedProduct.codigo}` : 'Sin código'}
          </p>
          <dl className="product-facts">
            {[
              ...data.producto.caracteristicas,
              ...(variant && variant.id !== data.producto.id ? variant.caracteristicas : []),
            ].map((a, i) => (
              <div key={`${a.nombre}:${i}`}>
                <dt>{a.nombre}</dt>
                <dd>{a.valor}</dd>
              </div>
            ))}
          </dl>
        </div>
        <aside className="inventory-total">
          <small>Stock en tus locales</small>
          <strong>{total === null ? 'Conteo pendiente' : `${total} unid.`}</strong>
          <span>{transit} en tránsito</span>
          <small>Solo locales con acceso</small>
        </aside>
      </header>
      {data.producto.nivel_registro === 'avanzado' && (
        <ChoicePicker
          label="Combinación"
          value={selected}
          options={[
            {
              id: '',
              title: 'Todas las combinaciones',
              description: 'Resumen del modelo en cada local',
            },
            ...data.combinaciones.map((p) => ({
              id: p.id,
              title: p.nombre,
              description:
                p.caracteristicas.map((a) => `${a.nombre}: ${a.valor}`).join(' · ') ||
                p.codigo ||
                'Sin características',
            })),
          ]}
          onChange={setSelected}
        />
      )}
      <div className="stock-table-scroll">
        <table className="stock-table stock-location-table">
          <thead>
            <tr>
              <th>Ubicación</th>
              <th>Stock actual</th>
              <th>Stock mínimo</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {page.items.map((l) => {
              const qty = balance(l.id),
                min = minimum(l.id);
              const lows = entries(l.id).filter(
                (s) =>
                  s?.estado === 'confirmado' &&
                  s.minimo != null &&
                  s.cantidad !== null &&
                  s.cantidad <= s.minimo,
              ).length;
              return (
                <tr key={l.id} className={local?.id === l.id ? 'current-local' : ''}>
                  <th>
                    <button
                      type="button"
                      className="stock-local-button"
                      aria-pressed={local?.id === l.id}
                      onClick={() => setLocal(l.id)}
                    >
                      {l.nombre}
                    </button>
                  </th>
                  <td>
                    <strong>{qty === null ? 'Por contar' : qty}</strong>
                  </td>
                  <td>{min ?? 'Sin configurar'}</td>
                  <td>
                    <StockGauge
                      compact
                      quantity={qty}
                      minimum={min}
                      lowCount={!variant ? lows : 0}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {local && (
        <>
          <div className="inventory-actions">
            <Button
              variant="secondary"
              disabled={
                !variant ||
                current === null ||
                !local.transferir ||
                !variant.activo ||
                current === 0
              }
              onClick={() =>
                variant &&
                current !== null &&
                setOperation({ tipo: 'salida', product: variant, stock: current, local })
              }
            >
              <ArrowRightLeft size={18} />
              Transferir stock
            </Button>
            <Button
              variant="secondary"
              disabled={!variant || current === null || !local.ajustar || !variant.activo}
              onClick={() =>
                variant &&
                current !== null &&
                setOperation({ tipo: 'ajuste', product: variant, stock: current, local })
              }
            >
              <SlidersHorizontal size={18} />
              Ajustar stock
            </Button>
            <Button variant="ghost" onClick={() => setHistory((h) => !h)}>
              {history ? 'Ocultar movimientos' : 'Traslados e historial'}
            </Button>
          </div>
          {!variant && (
            <p className="field-hint">
              Elige una combinación para trasladar o ajustar sus unidades.
            </p>
          )}
          {variant && current === null && (
            <Notice>
              Este producto aún no tiene conteo confirmado en {local.nombre}.{' '}
              <Link
                to={inventoryLink(base, { productId: variant.id, localId: local.id, count: true })}
              >
                Ir a contar este producto
              </Link>
            </Notice>
          )}
          {history && (
            <StockActivity
              key={local.id}
              local={local}
              locals={data.locales}
              productId={variant?.id ?? data.producto.id}
              onChanged={onChanged}
            />
          )}
          {data.producto.nivel_registro === 'avanzado' && (
            <StockMatrix
              products={data.combinaciones}
              axes={data.producto.ejes_variantes}
              stocks={data.existencias}
              localId={local.id}
              selected={selected}
              onSelect={setSelected}
            />
          )}
        </>
      )}
      {!local && <Notice>No tienes locales con permisos de inventario disponibles.</Notice>}
      {operation && (
        <Modal
          label={operation.tipo === 'salida' ? 'Transferir stock' : 'Ajustar stock'}
          onClose={() => setOperation(null)}
        >
          <StockOperationForm
            operation={operation}
            locals={data.locales}
            onSaved={async () => {
              await onChanged();
              setOperation(null);
            }}
          />
        </Modal>
      )}
    </div>
  );
}

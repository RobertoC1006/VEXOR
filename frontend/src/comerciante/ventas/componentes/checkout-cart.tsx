import { ProductPhoto } from '../../productos/componentes/product-photo';
import { useEffect, useState } from 'react';
import { cents, soles } from '../amounts';
import type { CartLine, CheckoutBody } from '../types';

export function CheckoutCart({
  body,
  lines,
  total,
}: {
  body: CheckoutBody;
  lines: CartLine[];
  total: number;
}) {
  const [expanded, setExpanded] = useState(() => window.innerWidth > 700);
  useEffect(() => {
    const resize = () => setExpanded(window.innerWidth > 700);
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);
  const subtotal = body.lineas.reduce(
    (sum, line) => sum + (cents(line.precio_esperado) ?? 0) * line.cantidad,
    0,
  );
  return (
    <details
      className="pos-checkout-cart"
      open={expanded}
      onToggle={(event) => setExpanded(event.currentTarget.open)}
    >
      <summary>
        Resumen del carrito{' '}
        <span>{body.lineas.reduce((sum, line) => sum + line.cantidad, 0)} productos</span>
      </summary>
      <div className="pos-checkout-cart-lines">
        {body.lineas.map((line, index) => {
          const detail = lines.find(
            (item) =>
              item.product.id === line.producto_id &&
              item.presentation?.id === line.presentacion_id,
          );
          return (
            <article key={index}>
              {detail && (
                <ProductPhoto
                  id={detail.product.foto_id}
                  version={detail.product.foto_version}
                  name={detail.product.modelo_nombre}
                />
              )}
              <div>
                <strong>{detail?.product.modelo_nombre ?? 'Producto de la venta'}</strong>
                {detail?.product.producto_padre_id && <small>{detail.product.nombre}</small>}
                <small>
                  {line.cantidad} × {soles(cents(line.precio_esperado) ?? 0)} ·{' '}
                  {detail?.presentation?.nombre ?? 'Unidad'}
                </small>
              </div>
              <b>{soles((cents(line.precio_esperado) ?? 0) * line.cantidad)}</b>
            </article>
          );
        })}
        <dl className="pos-checkout-totals">
          <div>
            <dt>Subtotal</dt>
            <dd>{soles(subtotal)}</dd>
          </div>
          <div>
            <dt>Descuento acordado</dt>
            <dd>− {soles(cents(body.descuento) ?? 0)}</dd>
          </div>
          <div>
            <dt>Total a pagar</dt>
            <dd>{soles(total)}</dd>
          </div>
        </dl>
      </div>
    </details>
  );
}

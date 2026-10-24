import { Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { ProductPhoto } from '../../productos/componentes/product-photo';
import { DiscountInput } from './discount-input';
import { Button, Field } from '../../../compartido/componentes/ui';
import { soles, unitPrice } from '../amounts';
import type { CartLine } from '../types';
export function Cart({
  lines,
  subtotal,
  discount,
  onQuantity,
  onDiscount,
  onCharge,
  onClear,
  canDiscount,
  discountLimit,
  issue,
  name,
  onName,
  onHold,
  onRemoveDiscount,
  busy = false,
  active = false,
}: {
  name: string;
  onName: (v: string) => void;
  onHold: () => void;
  onRemoveDiscount: () => void;
  busy?: boolean;
  active?: boolean;
  lines: CartLine[];
  subtotal: number;
  discount: number;
  onQuantity: (key: string, quantity: number) => void;
  onDiscount: (value: number) => void;
  onCharge: () => void;
  onClear: () => void;
  canDiscount: boolean;
  discountLimit: number;
  issue: string | null;
}) {
  const [discountValid, setDiscountValid] = useState(true);
  return (
    <aside id="pos-cart" className="pos-cart" aria-label="Carrito de venta" tabIndex={-1}>
      <fieldset disabled={busy} className="pos-cart-content">
        <div className="pos-panel-heading">
          <h2>
            <ShoppingCart size={20} />
            Carrito de venta
          </h2>
          <Button variant="ghost" onClick={onClear} disabled={!lines.length}>
            {active ? 'Descartar' : 'Vaciar'}
          </Button>
        </div>
        <a href="#pos-catalog" className="pos-back-catalog">
          Seguir eligiendo productos
        </a>
        <p className="pos-customer">
          Comprador general <span>Sin registro obligatorio</span>
        </p>
        <div className="pos-cart-reference">
          <Field
            id="pos-cart-name"
            label="Referencia del carrito (opcional)"
            placeholder="Ej.: compra para recoger"
            maxLength={80}
            value={name}
            onChange={(e) => onName(e.target.value)}
          />
        </div>
        <div className="pos-cart-lines">
          {!lines.length && (
            <div className="pos-cart-empty">
              <ShoppingCart size={36} />
              <strong>Tu próxima venta empieza aquí</strong>
              <p>Busca o escanea los productos que el comprador llevará.</p>
            </div>
          )}
          {lines.map((line) => (
            <article className="pos-cart-line" key={line.key}>
              <ProductPhoto
                id={line.product.foto_id}
                version={line.product.foto_version}
                name={line.product.nombre}
              />
              <div className="pos-cart-description">
                <strong>{line.product.modelo_nombre}</strong>
                {line.product.producto_padre_id && <small>{line.product.nombre}</small>}
                <small>
                  {line.presentation
                    ? `${line.presentation.nombre} (${line.presentation.unidades} unidades)`
                    : 'Unidad'}{' '}
                  ·{' '}
                  {!line.presentation && line.product.precio === null
                    ? 'Precio pendiente'
                    : soles(unitPrice(line))}
                </small>
              </div>
              <strong className="pos-line-total">{soles(unitPrice(line) * line.quantity)}</strong>
              <div className="pos-quantity">
                <Button
                  variant="secondary"
                  aria-label={`Quitar una unidad de ${line.product.nombre}`}
                  onClick={() => onQuantity(line.key, line.quantity - 1)}
                >
                  <Minus size={16} />
                </Button>
                <input
                  aria-label={`Cantidad de ${line.product.nombre}`}
                  type="number"
                  min={1}
                  max={1000000}
                  step={1}
                  value={line.quantity}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    if (Number.isInteger(n) && n > 0 && n <= 1000000) onQuantity(line.key, n);
                  }}
                />
                <Button
                  variant="secondary"
                  aria-label={`Agregar una unidad de ${line.product.nombre}`}
                  disabled={line.quantity >= 1000000}
                  onClick={() => onQuantity(line.key, line.quantity + 1)}
                >
                  <Plus size={16} />
                </Button>
              </div>
              <Button
                variant="ghost"
                aria-label={`Eliminar ${line.product.nombre}`}
                onClick={() => onQuantity(line.key, 0)}
              >
                <Trash2 size={18} />
              </Button>
            </article>
          ))}
        </div>
        <div className="pos-cart-footer">
          <div>
            <span>Subtotal</span>
            <strong>{soles(subtotal)}</strong>
          </div>
          <DiscountInput
            subtotal={subtotal}
            discount={discount}
            limit={discountLimit}
            disabled={!lines.length || !canDiscount}
            onChange={onDiscount}
            onValidity={setDiscountValid}
          />
          <div className="pos-grand-total">
            <span>Total a pagar</span>
            <strong>{soles(subtotal - discount)}</strong>
          </div>
          {discount > 0 && (
            <Button variant="ghost" onClick={onRemoveDiscount}>
              Quitar descuento
            </Button>
          )}
          {issue && (
            <p className="pos-warning" role="status">
              {issue}
            </p>
          )}
          <Button
            disabled={!lines.length || !!issue || discount > subtotal || !discountValid}
            onClick={onCharge}
          >
            Cobrar venta
          </Button>
          <Button variant="secondary" disabled={!lines.length || !discountValid} onClick={onHold}>
            Guardar en espera y nueva venta
          </Button>
          <small>El carrito no reserva ni descuenta existencias.</small>
        </div>
      </fieldset>
    </aside>
  );
}

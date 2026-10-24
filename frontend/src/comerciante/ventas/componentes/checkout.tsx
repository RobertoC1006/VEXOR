import { useAction } from '../../../compartido/api/use-action';
import { useRef, useState } from 'react';
import { Layers, Wallet } from 'lucide-react';
import { CheckoutCart } from './checkout-cart';
import { PaymentBadge, paymentMethods } from './payment-detail';
import { Modal } from '../../../compartido/componentes/modal';
import { Button, Field, Notice } from '../../../compartido/componentes/ui';
import { api, ApiError } from '../../../compartido/api/api';
import { useBusiness } from '../../negocio/context';
import { cents, decimal, payment, soles } from '../amounts';
import { readPendingCharge, chargeStorageKey } from '../charge-recovery';
import type { CartLine, ChargeBody, Sale } from '../types';
import '../../estilos/pos-checkout.css';

export function Checkout({
  body,
  total,
  onClose,
  onSuccess,
  lines = [],
}: {
  body: Omit<ChargeBody, 'operacion_id' | 'pagos' | 'efectivo_recibido'>;
  total: number;
  onClose: () => void;
  onSuccess: (sale: Sale) => void;
  lines?: CartLine[];
}) {
  const { base, access } = useBusiness();
  const storageKey = chargeStorageKey(access.miembro_id, base);
  const request = useRef<ChargeBody | null>(readPendingCharge(storageKey));
  const [mode, setMode] = useState(() => {
    const payments = request.current?.pagos;
    if (!payments) return 'efectivo';
    const used = Object.entries(payments).filter(([, value]) => (cents(value) ?? 0) > 0);
    return used.length > 1 ? 'mixto' : (used[0]?.[0] ?? 'efectivo');
  });
  const [yape, setYape] = useState(request.current?.pagos.yape ?? '0'),
    [plin, setPlin] = useState(request.current?.pagos.plin ?? '0'),
    [cash, setCash] = useState(request.current?.efectivo_recibido ?? decimal(total)),
    [received, setReceived] = useState(request.current?.efectivo_recibido ?? '');
  const action = useAction();
  const { busy, error } = action;
  const [uncertain, setUncertain] = useState(!!request.current);
  const receivedValue = mode === 'mixto' ? cash : received;
  const values = payment(total, yape, plin, receivedValue || '0');
  const amounts = { efectivo: cash, yape, plin };
  const parsed = [cents(receivedValue || '0'), cents(yape), cents(plin)];
  const collected = parsed.some((value) => value === null)
    ? null
    : parsed.reduce<number>((sum, value) => sum + value!, 0);
  const complete = !!values && values.remaining === 0;
  const locked = busy || uncertain;
  function choose(value: string) {
    setMode(value);
    setCash(value === 'efectivo' ? decimal(total) : '0');
    setYape(value === 'yape' ? decimal(total) : '0');
    setPlin(value === 'plin' ? decimal(total) : '0');
    setReceived(value === 'efectivo' || value === 'mixto' ? '' : '0');
  }
  async function charge() {
    if (busy || (!uncertain && !complete)) return;
    if (!request.current && values)
      request.current = {
        ...body,
        operacion_id: crypto.randomUUID(),
        pagos: {
          efectivo: decimal(values.cash),
          yape: decimal(values.yape),
          plin: decimal(values.plin),
        },
        efectivo_recibido: decimal(values.received),
      };
    await action.run(async () => {
      try {
        // Recovery of an in-flight online request; this is not an offline sales queue.
        sessionStorage.setItem(storageKey, JSON.stringify(request.current));
        const sale = await api<Sale>(`${base}/ventas`, {
          method: 'POST',
          body: JSON.stringify(request.current),
        });
        sessionStorage.removeItem(storageKey);
        onSuccess(sale);
      } catch (err) {
        const unknown = !(err instanceof ApiError) || err.status === 0 || err.status >= 500;
        setUncertain(unknown);
        if (!unknown) {
          request.current = null;
          sessionStorage.removeItem(storageKey);
        }
        throw err;
      }
    }, '');
  }
  return (
    <Modal label="Cobrar venta" onClose={onClose} busy={locked}>
      <div className="pos-checkout-layout">
        <CheckoutCart body={request.current ?? body} lines={lines} total={total} />
        <div className="pos-checkout">
          <div className="pos-checkout-total">
            <span>Total a pagar</span>
            <strong>{soles(total)}</strong>
          </div>
          <div className="pos-payment-modes" role="group" aria-label="Tipo de pago">
            <Button
              variant={mode !== 'mixto' ? 'primary' : 'secondary'}
              disabled={locked}
              aria-pressed={mode !== 'mixto'}
              onClick={() => choose('efectivo')}
            >
              <Wallet size={18} />
              Pago único
            </Button>
            <Button
              variant={mode === 'mixto' ? 'primary' : 'secondary'}
              disabled={locked}
              aria-pressed={mode === 'mixto'}
              onClick={() => choose('mixto')}
            >
              <Layers size={18} />
              Pago mixto
            </Button>
          </div>
          {mode !== 'mixto' && (
            <div className="pos-single-methods" role="group" aria-label="Medio de pago">
              {paymentMethods.map((method) => (
                <Button
                  key={method.id}
                  variant="secondary"
                  disabled={locked}
                  aria-pressed={mode === method.id}
                  onClick={() => choose(method.id)}
                >
                  <PaymentBadge method={method} />
                  {method.label}
                </Button>
              ))}
            </div>
          )}
          <fieldset disabled={locked} className="pos-payment-fields">
            {mode === 'mixto' && (
              <>
                <p>
                  Ingresa lo recibido en efectivo, Yape y Plin. El vuelto se calcula
                  automáticamente.
                </p>
                {paymentMethods.map((method) => (
                  <div className="pos-payment-row" key={method.id}>
                    <PaymentBadge method={method} />
                    <Field
                      id={`pos-${method.id}`}
                      label={`${method.label} (S/)`}
                      inputMode="decimal"
                      value={amounts[method.id]}
                      onChange={(e) => {
                        const setters = { efectivo: setCash, yape: setYape, plin: setPlin };
                        setters[method.id](e.target.value);
                      }}
                    />
                  </div>
                ))}
              </>
            )}
            {mode === 'efectivo' && (
              <div className="pos-cash-detail">
                <div>
                  <span>Parte de la venta en efectivo</span>
                  <strong>{soles(total)}</strong>
                </div>
                <Field
                  id="pos-received"
                  label="Efectivo recibido (S/)"
                  inputMode="decimal"
                  value={received}
                  onChange={(e) => setReceived(e.target.value)}
                />
                <Button variant="secondary" onClick={() => setReceived(decimal(total))}>
                  Importe exacto
                </Button>
                {(cents(received || '0') ?? 0) < total && (
                  <p className="pos-warning">Falta recibir efectivo para cubrir esta parte.</p>
                )}
              </div>
            )}
          </fieldset>
          <dl className="pos-checkout-totals pos-assigned-summary" aria-live="polite">
            <div>
              <dt>Total a pagar</dt>
              <dd>{soles(total)}</dd>
            </div>
            <div>
              <dt>Monto recibido</dt>
              <dd>{collected === null ? 'Revisa los importes' : soles(collected)}</dd>
            </div>
            <div>
              <dt>Faltante</dt>
              <dd>{values ? soles(values.remaining) : '—'}</dd>
            </div>
          </dl>
          {values && (
            <div className="pos-checkout-total" aria-live="polite">
              <span>Vuelto a entregar</span>
              <strong>{soles(values.change)}</strong>
            </div>
          )}
          {!values && (
            <Notice>
              {(cents(yape) ?? 0) + (cents(plin) ?? 0) > total
                ? 'Yape y Plin superan el total de la venta. Revisa esos importes; el vuelto se entrega solo del efectivo recibido.'
                : (cents(yape) ?? 0) + (cents(plin) ?? 0) === total &&
                    (cents(receivedValue) ?? 0) > 0
                  ? 'Yape y Plin ya cubren el total. Retira el efectivo de este pago.'
                  : 'Introduce importes válidos para calcular el pago y el vuelto.'}
            </Notice>
          )}
          {complete && (
            <p className="pos-payment-ready" role="status">
              El pago cubre el total de la venta.
            </p>
          )}
          {error && <Notice>{error}</Notice>}
          {uncertain && (
            <Notice tone="info">
              No se confirmó la respuesta del cobro. Reintenta esta misma operación para conocer el
              resultado sin duplicarla. Mantén esta ventana abierta.
            </Notice>
          )}
          <Button busy={busy} disabled={!uncertain && !complete} onClick={() => void charge()}>
            {uncertain ? 'Reintentar mismo cobro' : 'Cobrar venta'}
          </Button>
          <Button variant="secondary" disabled={locked} onClick={onClose}>
            Volver al carrito
          </Button>
        </div>
      </div>
    </Modal>
  );
}

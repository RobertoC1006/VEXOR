import { Banknote, Smartphone } from 'lucide-react';
import { cents, soles } from '../amounts';
import type { Sale } from '../types';

export const paymentMethods = [
  { id: 'efectivo', label: 'Efectivo', Icon: Banknote },
  { id: 'yape', label: 'Yape', Icon: Smartphone },
  { id: 'plin', label: 'Plin', Icon: Smartphone },
] as const;

export function PaymentBadge({ method }: { method: (typeof paymentMethods)[number] }) {
  return (
    <span className={`pos-payment-badge ${method.id}`} aria-hidden="true">
      <method.Icon size={20} />
    </span>
  );
}

export function PaymentDetail({ sale }: { sale: Sale }) {
  return (
    <div className="pos-receipt-payments" aria-label="Detalle del pago">
      {paymentMethods
        .filter(({ id }) => (cents(sale.pagos[id]) ?? 0) > 0)
        .map((method) => (
          <div key={method.id}>
            <span>
              <PaymentBadge method={method} />
              {method.label}
            </span>
            <strong>{soles(cents(sale.pagos[method.id])!)}</strong>
          </div>
        ))}
      {(cents(sale.pagos.efectivo) ?? 0) > 0 && (
        <>
          <div>
            <span>Recibido en efectivo</span>
            <strong>{soles(cents(sale.efectivo_recibido)!)}</strong>
          </div>
          <div>
            <span>Vuelto</span>
            <strong>{soles(cents(sale.vuelto)!)}</strong>
          </div>
        </>
      )}
    </div>
  );
}

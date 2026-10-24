import { MoneyField } from '../../../compartido/dinero/money-field';
import { useEffect, useState } from 'react';
import { Button } from '../../../compartido/componentes/ui';
import { cents, decimal, soles, suggestedTotals } from '../amounts';

export function DiscountInput({
  subtotal,
  discount,
  limit,
  disabled,
  onChange,
  onValidity,
}: {
  subtotal: number;
  discount: number;
  limit: number;
  disabled: boolean;
  onChange: (discount: number) => void;
  onValidity: (valid: boolean) => void;
}) {
  const [draft, setDraft] = useState({ value: decimal(subtotal - discount), discount, subtotal });
  useEffect(() => {
    setDraft((previous) =>
      previous.discount === discount && previous.subtotal === subtotal
        ? previous
        : {
            value: decimal(subtotal - discount),
            discount,
            subtotal,
          },
    );
  }, [discount, subtotal]);
  // Preserve partially typed amounts; refresh when the cart changes externally.
  const value =
    draft.discount === discount && draft.subtotal === subtotal
      ? draft.value
      : decimal(subtotal - discount);
  const amount = cents(value);
  const result = amount === null ? null : subtotal - amount;
  const valid =
    disabled || (result !== null && result >= 0 && result <= subtotal && result <= limit);
  useEffect(() => onValidity(valid), [valid, onValidity]);

  return (
    <section className="pos-discount" aria-label="Descuento de la venta">
      <MoneyField
        id="pos-discount"
        label="Dejar total en S/"

        value={value}
        disabled={disabled}
        aria-invalid={!valid}
        aria-describedby={!valid ? 'pos-discount-error' : undefined}
        onChange={(e) => {
          const text = e.target.value;
          const amount = cents(text);
          const next = amount === null ? null : subtotal - amount;
          const accepted = next !== null && next >= 0 && next <= subtotal && next <= limit;
          setDraft({ value: text, discount: accepted ? next : discount, subtotal });
          if (accepted) onChange(next);
        }}
      />
      {!disabled && suggestedTotals(subtotal, limit).length > 0 && (
        <div className="pos-total-suggestions" role="group" aria-label="Totales sugeridos">
          {suggestedTotals(subtotal, limit).map((total) => (
            <Button
              key={total}
              variant="secondary"
              aria-pressed={valid && amount === total}
              onClick={() => {
                const discount = subtotal - total;
                setDraft({ value: decimal(total), discount, subtotal });
                onChange(discount);
              }}
            >
              {soles(total)}
            </Button>
          ))}
        </div>
      )}
      {!valid && (
        <p id="pos-discount-error" className="pos-warning" role="alert">
          Introduce un importe válido. Descuento máximo: {soles(Math.min(subtotal, limit))}.
        </p>
      )}
      <div className="pos-discount-summary">
        <span>Descuento aplicado</span>
        <strong>− {soles(discount)}</strong>
      </div>
    </section>
  );
}

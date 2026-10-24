import type { ComponentProps } from 'react';
import { Field } from '../componentes/ui';
import { moneyInput } from './money';

export function MoneyField({ onChange, onFocus, onClick, ...props }: ComponentProps<typeof Field>) {
  return (
    <Field
      {...props}
      inputMode="decimal"
      onFocus={(event) => {
        onFocus?.(event);
        if (!event.defaultPrevented && /^0(?:[.,]0*)?$/.test(event.currentTarget.value))
          event.currentTarget.select();
      }}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented && /^0(?:[.,]0*)?$/.test(event.currentTarget.value))
          event.currentTarget.select();
      }}
      onChange={(event) => {
        const input = event.currentTarget;
        const original = input.value;
        const normalized = moneyInput(original);
        if (normalized !== original) {
          const position = input.selectionStart;
          input.value = normalized;
          if (position !== null) {
            const next = Math.max(0, position - original.length + normalized.length);
            input.setSelectionRange(next, next);
          }
        }
        onChange?.(event);
      }}
    />
  );
}

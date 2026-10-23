import { useState } from 'react';
import { api } from '../../../compartido/api/api';
import { useAction } from '../../../compartido/api/use-action';
import { Button, Field, Notice } from '../../../compartido/componentes/ui';
import { ActionFeedback } from '../../../compartido/componentes/feedback';
import { ChoicePicker } from '../../../compartido/componentes/choice-picker';
import { ConfirmationDialog } from '../../../compartido/componentes/confirmation-dialog';
import { useBusiness } from '../../negocio/context';
import type { StockAction, StockLocal } from '../stock-types';
export function StockOperationForm({
  operation,
  locals,
  onSaved,
}: {
  operation: StockAction;
  locals: StockLocal[];
  onSaved: () => Promise<unknown>;
}) {
  const { base } = useBusiness();
  const action = useAction();
  const [key] = useState(() => crypto.randomUUID());
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [destination, setDestination] = useState('');
  const [confirm, setConfirm] = useState(false);
  const isReceipt = operation.tipo === 'recepcion',
    isAdjustment = operation.tipo === 'ajuste';
  const title = isReceipt
    ? 'Recibir traslado'
    : isAdjustment
      ? 'Ajustar stock'
      : 'Transferir stock';
  const delta = isAdjustment ? Number(quantity) - operation.stock : Number(quantity);
  const remaining = isReceipt ? operation.movement.cantidad - operation.movement.recibidas : 0;
  const summary = isReceipt
    ? `Recibir ${quantity} unidades en ${operation.local.nombre}. Quedarán ${remaining - Number(quantity)} en tránsito.`
    : isAdjustment
      ? `El saldo de ${operation.product.nombre} pasa de ${operation.stock} a ${quantity} unidades (${delta > 0 ? '+' : ''}${delta}).`
      : `Enviar ${quantity} unidades de ${operation.local.nombre} a ${locals.find((l) => l.id === destination)?.nombre}. Se descontarán del origen y quedarán en tránsito hasta su recepción.`;
  async function submit() {
    await action.run(async () => {
      const payload = {
        operacion_id: key,
        cantidad: delta,
        motivo: reason.trim(),
        ...(isReceipt
          ? { traslado_id: operation.movement.id }
          : {
              producto_id: operation.product.id,
              saldo_esperado: operation.stock,
              ...(!isAdjustment ? { destino_id: destination } : {}),
            }),
      };
      await api(
        `${base}/locales/${operation.local.id}/${isReceipt ? 'recepciones' : isAdjustment ? 'ajustes' : 'traslados'}`,
        { method: 'POST', body: JSON.stringify(payload) },
      );
      await onSaved();
    });
    setConfirm(false);
  }
  return (
    <form
      className="settings-form"
      onSubmit={(e) => {
        e.preventDefault();
        setConfirm(true);
      }}
    >
      <h3>{title}</h3>
      <p>
        {isReceipt ? operation.movement.nombre : operation.product.nombre} ·{' '}
        {operation.local.nombre}
      </p>
      <Notice tone="info">
        {isReceipt
          ? `Faltan recibir ${remaining} unidades. Si recibes menos, explica la diferencia; el resto seguirá en tránsito.`
          : isAdjustment
            ? 'Cuenta lo que hay físicamente. Se registrará la diferencia y su motivo, conservando el historial.'
            : 'Elige otro local con conteo confirmado para este producto. Al enviar, las unidades dejan de estar disponibles en el origen.'}
      </Notice>
      <fieldset disabled={action.busy}>
        {!isReceipt && !isAdjustment && (
          <ChoicePicker
            label="Local de destino"
            value={destination}
            options={locals
              .filter((l) => l.id !== operation.local.id)
              .map((l) => ({
                id: l.id,
                title: l.nombre,
                description: l.habilitado_venta ? 'Puesto' : 'Almacén',
              }))}
            onChange={setDestination}
          />
        )}
        <Field
          id="movement-quantity"
          label={
            isAdjustment
              ? 'Cantidad física actual'
              : isReceipt
                ? 'Unidades recibidas'
                : 'Unidades a enviar'
          }
          required
          type="number"
          inputMode="numeric"
          step={1}
          min={isAdjustment ? 0 : 1}
          max={isReceipt ? remaining : isAdjustment ? 2147483647 : operation.stock}
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
        />
        <Field
          id="movement-reason"
          label={isReceipt ? 'Nota de recepción o motivo de la diferencia' : 'Motivo'}
          required
          maxLength={240}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </fieldset>
      <ActionFeedback {...action} />
      <Button
        type="submit"
        busy={action.busy}
        disabled={
          !quantity ||
          !reason.trim() ||
          delta === 0 ||
          (!isReceipt && !isAdjustment && !destination)
        }
      >
        Revisar {isReceipt ? 'recepción' : isAdjustment ? 'ajuste' : 'traslado'}
      </Button>
      {confirm && (
        <ConfirmationDialog
          title={title}
          description={`${summary} Motivo: ${reason}`}
          confirmLabel={
            isReceipt
              ? 'Confirmar recepción'
              : isAdjustment
                ? 'Confirmar ajuste'
                : 'Confirmar salida'
          }
          busy={action.busy}
          onCancel={() => setConfirm(false)}
          onConfirm={submit}
        />
      )}
    </form>
  );
}

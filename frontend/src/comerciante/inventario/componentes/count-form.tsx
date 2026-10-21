import { useState } from 'react';
import { api } from '../../../compartido/api/api';
import { useAction } from '../../../compartido/api/use-action';
import { Button, Field, Notice } from '../../../compartido/componentes/ui';
import { CheckField } from '../../../compartido/componentes/form-controls';
import { ActionFeedback } from '../../../compartido/componentes/feedback';
import { ConfirmationDialog } from '../../../compartido/componentes/confirmation-dialog';
import { useBusiness } from '../../negocio/context';
import type { InventoryItem, InventoryPermissions } from '../types';

export function CountForm({
  item,
  localId,
  permissions,
  onSaved,
  onCancel,
}: {
  item: InventoryItem;
  localId: string;
  permissions: InventoryPermissions;
  onSaved: () => Promise<unknown>;
  onCancel: () => void;
}) {
  const { base } = useBusiness();
  const [quantity, setQuantity] = useState(item.cantidad === null ? '' : String(item.cantidad));
  const [reference, setReference] = useState(item.referencia ?? '');
  const [reviewed, setReviewed] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const action = useAction();
  const changed =
    quantity !== String(item.cantidad) || (reference.trim() || null) !== item.referencia;
  const url = `${base}/locales/${localId}/inventario/${item.id}`;
  async function save() {
    if (
      await action.run(() =>
        api(`${url}/conteo`, {
          method: 'PUT',
          body: JSON.stringify({
            cantidad: Number(quantity),
            referencia: reference.trim() || null,
            version: item.version,
          }),
        }),
      )
    )
      await onSaved();
  }
  async function confirmCount() {
    const ok = await action.run(() =>
      api(`${url}/confirmar`, {
        method: 'POST',
        body: JSON.stringify({
          version: item.version,
          revision_fisica: true,
        }),
      }),
    );
    setConfirm(false);
    if (ok) await onSaved();
  }
  return (
    <section className="panel settings-panel" aria-label={`Conteo de ${item.nombre}`}>
      <h2>{item.nombre}</h2>
      <Notice tone="info">
        Antes de confirmar, cuenta lo que queda físicamente y revisa las ventas realizadas fuera de
        VEXOR durante la preparación.
      </Notice>
      <form
        className="settings-form"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <fieldset disabled={action.busy || !permissions.contar}>
          <Field
            id="count-quantity"
            label="Cantidad de unidades"
            type="number"
            inputMode="numeric"
            min={0}
            max={2147483647}
            step={1}
            required
            value={quantity}
            onChange={(e) => {
              setQuantity(e.target.value);
              setReviewed(false);
            }}
          />
          <Field
            id="count-reference"
            label="Dónde encontrarlo (opcional)"
            maxLength={240}
            placeholder="Ej.: vitrina de entrada, estante superior"
            value={reference}
            onChange={(e) => {
              setReference(e.target.value);
              setReviewed(false);
            }}
          />
          <p className="field-hint">
            La cantidad es el total de este local; la referencia no indica cantidades por estante.
          </p>
        </fieldset>
        {permissions.confirmar && item.estado === 'preparacion' && (
          <CheckField
            label="Revisé que el conteo guardado coincide con lo que queda físicamente"
            checked={reviewed}
            onChange={setReviewed}
            disabled={action.busy || changed}
          />
        )}
        {changed && item.estado === 'preparacion' && (
          <p className="field-hint">
            Guarda el borrador y vuelve a abrirlo para confirmar la cantidad actualizada.
          </p>
        )}
        <ActionFeedback {...action} />
        <div className="form-actions">
          <Button type="button" variant="secondary" disabled={action.busy} onClick={onCancel}>
            Cerrar
          </Button>
          {permissions.contar && (
            <Button
              type="submit"
              variant="secondary"
              busy={action.busy}
              disabled={!quantity || !changed}
            >
              Guardar borrador
            </Button>
          )}
          {permissions.confirmar && item.estado === 'preparacion' && (
            <Button
              type="button"
              disabled={!reviewed || changed || action.busy}
              onClick={() => setConfirm(true)}
            >
              Confirmar conteo
            </Button>
          )}
        </div>
      </form>
      {confirm && (
        <ConfirmationDialog
          title="Confirmar inventario inicial"
          description={`${item.nombre}: ${item.cantidad} unidades en este local. Este conteo quedará confirmado y no podrás editarlo como borrador.`}
          confirmLabel="Confirmar conteo"
          busy={action.busy}
          onCancel={() => setConfirm(false)}
          onConfirm={confirmCount}
        />
      )}
    </section>
  );
}

import { MoneyField } from '../../../compartido/dinero/money-field';
import { useAction } from '../../../compartido/api/use-action';
import { useState } from 'react';
import { CodeField } from '../../../compartido/escaneo/code-field';
import { Modal } from '../../../compartido/componentes/modal';
import { Button, Field, Notice } from '../../../compartido/componentes/ui';
import { api } from '../../../compartido/api/api';
import { useBusiness } from '../../negocio/context';
import { cents, decimal } from '../amounts';
import { CheckField } from '../../../compartido/componentes/form-controls';
import type { PosProduct, Presentation } from '../types';
export function PolicyForm({
  value,
  onClose,
  onSaved,
}: {
  value: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { base } = useBusiness();
  const [limit, setLimit] = useState(value);
  const action = useAction();
  const { busy, error } = action;
  return (
    <Modal size="compact" label="Política de descuentos" onClose={onClose} busy={busy}>
      <form
        className="pos-form"
        onSubmit={async (e) => {
          e.preventDefault();
          if (busy || cents(limit) === null) return;
          await action.run(async () => {
            await api(`${base}/ventas/politica`, {
              method: 'PUT',
              body: JSON.stringify({ limite_descuento: decimal(cents(limit)!) }),
            });
            onSaved();
          });
        }}
      >
        <p>
          Máximo por venta para trabajadores con permiso de aplicar descuentos. El propietario puede
          superar este límite en su propia venta.
        </p>
        <MoneyField
          id="discount-limit"
          label="Límite en soles"

          value={limit}
          onChange={(e) => setLimit(e.target.value)}
        />
        {error && <Notice>{error}</Notice>}
        <Button type="submit" busy={busy} disabled={cents(limit) === null}>
          Guardar política
        </Button>
      </form>
    </Modal>
  );
}
export function PresentationForm({
  product,
  editing,
  onClose,
  onSaved,
}: {
  product: PosProduct;
  editing?: Presentation;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { base } = useBusiness();
  const [code, setCode] = useState(editing?.codigo ?? '');
  const [active, setActive] = useState(true);
  const [name, setName] = useState(editing?.nombre ?? ''),
    [units, setUnits] = useState(String(editing?.unidades ?? 12)),
    [price, setPrice] = useState(editing?.precio ?? '');
  const action = useAction();
  const { busy, error } = action;
  return (
    <Modal
      size="compact"
      label={`${editing ? 'Editar' : 'Nueva'} presentación · ${product.nombre}`}
      onClose={onClose}
      busy={busy}
    >
      <form
        className="pos-form"
        onSubmit={async (e) => {
          e.preventDefault();
          if (
            busy ||
            cents(price) === null ||
            !name.trim() ||
            !Number.isInteger(Number(units)) ||
            Number(units) < 1 ||
            Number(units) > 1000000
          )
            return;
          await action.run(async () => {
            await api(`${base}/ventas/presentaciones${editing ? `/${editing.id}` : ''}`, {
              method: editing ? 'PUT' : 'POST',
              body: JSON.stringify({
                producto_id: product.id,
                nombre: name,
                unidades: Number(units),
                precio: decimal(cents(price)!),
                activo: active,
                codigo: code.trim() || null,
              }),
            });
            onSaved();
          });
        }}
      >
        <p>
          Define el contenido de esta presentación. Su precio puede ser distinto del precio unitario
          multiplicado.
        </p>
        <Field
          id="presentation-name"
          label="Nombre"
          value={name}
          required
          maxLength={80}
          placeholder="Ej.: Docena"
          onChange={(e) => setName(e.target.value)}
        />
        <Field
          id="presentation-units"
          label="Unidades base por presentación"
          type="number"
          min={1}
          max={1000000}
          step={1}
          value={units}
          onChange={(e) => setUnits(e.target.value)}
        />
        <MoneyField
          id="presentation-price"
          label="Precio de la presentación (S/)"

          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
        <CodeField
          id="presentation-code"
          value={code}
          onChange={setCode}
          disabled={busy}
          hint="Este código agregará directamente la presentación al carrito."
        />
        {editing && (
          <CheckField label="Disponible para vender" checked={active} onChange={setActive} />
        )}
        {error && <Notice>{error}</Notice>}
        <Button
          type="submit"
          busy={busy}
          disabled={
            !name.trim() ||
            cents(price) === null ||
            !Number.isInteger(Number(units)) ||
            Number(units) < 1
          }
        >
          Guardar presentación
        </Button>
      </form>
    </Modal>
  );
}

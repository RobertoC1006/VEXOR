import { useState, type FormEvent } from 'react';
import { api } from '../../../compartido/api/api';
import { useAction } from '../../../compartido/api/use-action';
import { Button, Field } from '../../../compartido/componentes/ui';
import { CheckField, SelectField } from '../../../compartido/componentes/form-controls';
import { ActionFeedback } from '../../../compartido/componentes/feedback';
import { useBusiness } from '../../negocio/context';
import type { Product, RegistrationLevel, Attribute } from '../types';
import { CodeField } from '../../../compartido/escaneo/code-field';
import { AttributesEditor } from './attributes-editor';

const textFields = [
  { key: 'nombre', label: 'Nombre del producto', maxLength: 160, required: true },
  { key: 'alias', label: 'Otro nombre para buscarlo (opcional)', maxLength: 160 },
  { key: 'descripcion', label: 'Características y descripción (opcional)', maxLength: 1000 },
] as const;

function money(value: string) {
  if (!value.trim()) return null;
  const [whole, decimal] = value.trim().replace(',', '.').split('.');
  return `${whole.replace(/^0+(?=\d)/, '')}${decimal === undefined ? '' : `.${decimal}`}`;
}
export function ProductForm({
  product,
  onSaved,
  onCancel,
  parent,
  example = false,
}: {
  product?: Product;
  onSaved: () => Promise<unknown>;
  onCancel: () => void;
  parent?: Product;
  example?: boolean;
}) {
  const { base } = useBusiness();
  const action = useAction();
  const [values, setValues] = useState({
    nombre: product?.nombre ?? (example ? 'Sostén modelo de prueba' : ''),
    alias: product?.alias ?? '',
    codigo: product?.codigo ?? '',
    descripcion: product?.descripcion ?? '',
    precio: product?.precio ?? '',
    costo: product?.costo ?? '',
    activo: product?.activo ?? true,
  });
  const [level, setLevel] = useState<RegistrationLevel>(
    product?.nivel_registro ?? (example ? 'avanzado' : 'simple'),
  );
  const [attributes, setAttributes] = useState<Attribute[]>(
    product?.caracteristicas ??
      (example
        ? [
            { nombre: 'Marca', valor: 'Marca de prueba' },
            { nombre: 'Modelo', valor: 'Modelo de prueba' },
          ]
        : []),
  );
  async function submit(event: FormEvent) {
    event.preventDefault();
    const ok = await action.run(() =>
      api(
        `${base}/productos${product ? `/${product.id}` : parent ? `/${parent.id}/variantes` : ''}`,
        {
          method: product ? 'PATCH' : 'POST',
          body: JSON.stringify({
            nombre: values.nombre.trim(),
            alias: values.alias.trim() || null,
            codigo: values.codigo.trim() || null,
            descripcion: values.descripcion.trim() || null,
            precio: money(values.precio),
            costo: money(values.costo),
            activo: values.activo,
            nivel_registro: parent ? 'simple' : level,
            caracteristicas: attributes
              .filter((a) => a.nombre.trim() && a.valor.trim())
              .map((a) => ({ nombre: a.nombre.trim(), valor: a.valor.trim() })),
            ...(product ? { version: product.version } : {}),
          }),
        },
      ),
    );
    if (ok) await onSaved();
  }
  return (
    <section
      className="panel settings-panel"
      aria-label={product ? 'Editar producto' : 'Nuevo producto'}
    >
      <h2>
        {parent
          ? `${product ? 'Editar' : 'Nueva'} variante de ${parent.nombre}`
          : product
            ? 'Editar producto'
            : 'Nuevo producto'}
      </h2>
      <p className="muted">Empieza con el nombre. Puedes completar los demás datos después.</p>
      <form className="settings-form" onSubmit={(event) => void submit(event)}>
        <fieldset disabled={action.busy}>
          {!parent && (
            <>
              <SelectField
                label="Nivel de registro"
                value={level}
                onChange={(e) => setLevel(e.target.value as RegistrationLevel)}
              >
                <option value="simple">Simple · ficha y cantidad total</option>
                <option value="intermedio">Intermedio · características descriptivas</option>
                <option value="avanzado">Avanzado · variantes y cantidades separadas</option>
              </SelectField>
              <p className="field-hint">
                Elige el detalle para este producto, sea cual sea el rubro. Con variantes se cuenta
                cada combinación por separado.
              </p>
            </>
          )}
          {textFields.map(({ key, ...field }) => (
            <Field
              key={key}
              id={`product-${key}`}
              {...field}
              value={values[key]}
              onChange={(event) => setValues({ ...values, [key]: event.target.value })}
            />
          ))}
          <CodeField
            id="product-codigo"
            value={values.codigo}
            onChange={(codigo) => setValues({ ...values, codigo })}
            disabled={action.busy}
          />
          {(parent || level !== 'simple' || attributes.length > 0) && (
            <AttributesEditor value={attributes} onChange={setAttributes} variant={!!parent} />
          )}
          {!parent && level === 'avanzado' && (
            <p className="field-hint">
              Guarda la ficha y luego abre “Variantes” para registrar tallas, colores u otras
              combinaciones. No se contará un total adicional del modelo.
            </p>
          )}
          <div className="form-grid">
            {(['precio', 'costo'] as const).map((key) => (
              <Field
                key={key}
                id={`product-${key}`}
                label={
                  key === 'precio'
                    ? 'Precio por unidad (S/, opcional)'
                    : 'Costo por unidad (S/, opcional)'
                }
                inputMode="decimal"
                pattern="[0-9]{1,12}([.,][0-9]{1,2})?"
                placeholder="Pendiente"
                value={values[key]}
                onChange={(event) => setValues({ ...values, [key]: event.target.value })}
              />
            ))}
          </div>
          <p className="field-hint">Si no conoces el costo o el precio, deja el campo vacío.</p>
          {product && (
            <CheckField
              label="Producto activo"
              checked={values.activo}
              onChange={(activo) => setValues({ ...values, activo })}
              hint="Pausarlo conserva su ficha y sus conteos."
            />
          )}
        </fieldset>
        <ActionFeedback {...action} />
        <div className="form-actions">
          <Button type="button" variant="secondary" disabled={action.busy} onClick={onCancel}>
            Cancelar
          </Button>
          <Button
            type="submit"
            busy={action.busy}
            disabled={
              !values.nombre.trim() ||
              (!!parent && !attributes.some((a) => a.nombre.trim() && a.valor.trim()))
            }
          >
            Guardar producto
          </Button>
        </div>
      </form>
    </section>
  );
}

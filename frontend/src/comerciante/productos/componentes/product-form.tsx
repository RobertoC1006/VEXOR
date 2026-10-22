import { useState, type FormEvent } from 'react';
import { api, listAll } from '../../../compartido/api/api';
import { useResource } from '../../../compartido/api/use-resource';
import { useAction } from '../../../compartido/api/use-action';
import { Button, Field } from '../../../compartido/componentes/ui';
import { CheckField, SelectField } from '../../../compartido/componentes/form-controls';
import { ActionFeedback, ResourceState } from '../../../compartido/componentes/feedback';
import { useBusiness } from '../../negocio/context';
import type { Product, RegistrationLevel, Attribute } from '../types';
import { CodeField } from '../../../compartido/escaneo/code-field';
import { AttributesEditor } from './attributes-editor';
import { CategorySelect, useCategories } from '../../categorias/categories';
import { categoryDetails } from '../../categorias/templates';
import { CombinationsEditor } from './combinations-editor';
import {
  changedCombination,
  cleanAttributes,
  combinationBody,
  combinationDraft,
  initialAxes,
  moneyValue,
} from '../registration';

const textFields = [
  { key: 'nombre', label: 'Nombre del producto', maxLength: 160, required: true },
  { key: 'alias', label: 'Otro nombre para buscarlo (opcional)', maxLength: 160 },
  { key: 'descripcion', label: 'Características y descripción (opcional)', maxLength: 1000 },
] as const;

interface ProductFormProps {
  product?: Product;
  onSaved: () => Promise<unknown>;
  onCancel: () => void;
  parent?: Product;
  example?: boolean;
}
export function ProductForm(props: ProductFormProps) {
  if (props.product?.nivel_registro === 'avanzado' && !props.parent)
    return <ExistingModelForm {...props} />;
  return <ProductFields {...props} />;
}
function ExistingModelForm(props: ProductFormProps) {
  const { base } = useBusiness();
  const url = `${base}/productos/${props.product!.id}/variantes`;
  const resource = useResource(url, (signal) => listAll<Product>(url, signal));
  if (!resource.data) return <ResourceState error={resource.error} retry={resource.refresh} />;
  return <ProductFields {...props} initialCombinations={resource.data} />;
}
function ProductFields({
  product,
  onSaved,
  onCancel,
  parent,
  example = false,
  initialCombinations = [],
}: ProductFormProps & { initialCombinations?: Product[] }) {
  const { base } = useBusiness();
  const categories = useCategories();
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
  const advanced = !parent && level === 'avanzado';
  const [category, setCategory] = useState(product?.categoria_id ?? '');
  const [axes, setAxes] = useState(() =>
    initialAxes(
      product,
      initialCombinations,
      example
        ? ['Talla', 'Copa', 'Color']
        : categoryDetails(categories.categories, product?.categoria_id ?? ''),
    ),
  );
  const [rows, setRows] = useState(() => initialCombinations.map((p) => combinationDraft(p)));
  const [attributes, setAttributes] = useState<Attribute[]>(
    product?.caracteristicas ??
      (example
        ? [
            { nombre: 'Marca', valor: 'Marca de prueba' },
            { nombre: 'Modelo', valor: 'Modelo de prueba' },
          ]
        : (parent
            ? ['Talla', 'Copa', 'Color', 'Diseño']
            : ['Marca', 'Modelo', 'Talla', 'Color']
          ).map((nombre) => ({ nombre, valor: '' }))),
  );
  async function submit(event: FormEvent) {
    event.preventDefault();
    const ok = await action.run(async () => {
      const fields = {
        nombre: values.nombre.trim(),
        alias: values.alias.trim() || null,
        codigo: values.codigo.trim() || null,
        descripcion: values.descripcion.trim() || null,
        precio: moneyValue(values.precio),
        costo: moneyValue(values.costo),
        activo: values.activo,
        nivel_registro: parent ? 'simple' : level,
        caracteristicas: cleanAttributes(attributes),
        ...(!parent ? { categoria_id: category || null } : {}),
      };
      if (advanced) {
        const combinaciones = rows.filter(changedCombination).map(combinationBody);
        if (combinaciones.some((row) => !row.caracteristicas.length))
          throw new Error(
            'Completa al menos una característica en cada combinación que quieras guardar.',
          );
        if (new Set(axes.map((a) => a.trim().toLocaleLowerCase())).size !== axes.length)
          throw new Error('Cada diferencia debe tener un nombre distinto.');
        await api(`${base}/productos/${product ? `${product.id}/` : ''}registro`, {
          method: product ? 'PUT' : 'POST',
          body: JSON.stringify({
            producto: { ...fields, ejes_variantes: axes.map((a) => a.trim()) },
            ...(product ? { version: product.version } : {}),
            combinaciones,
          }),
        });
      } else
        await api(
          `${base}/productos${product ? `/${product.id}` : parent ? `/${parent.id}/variantes` : ''}`,
          {
            method: product ? 'PATCH' : 'POST',
            body: JSON.stringify({ ...fields, ...(product ? { version: product.version } : {}) }),
          },
        );
    });
    if (ok) await onSaved();
  }
  return (
    <section
      className="panel settings-panel"
      aria-label={
        advanced
          ? product
            ? 'Editar modelo y combinaciones'
            : 'Nuevo modelo con combinaciones'
          : product
            ? 'Editar producto'
            : 'Nuevo producto'
      }
    >
      <h2>
        {parent
          ? `${product ? 'Editar' : 'Nueva'} variante de ${parent.nombre}`
          : advanced
            ? product
              ? 'Editar modelo y combinaciones'
              : 'Nuevo modelo con combinaciones'
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
                onChange={(e) => {
                  const next = e.target.value as RegistrationLevel;
                  setLevel(next);
                  if (next === 'avanzado')
                    setAttributes(
                      attributes.filter(
                        (a) =>
                          a.valor.trim() ||
                          !['talla', 'copa', 'color', 'diseño'].includes(
                            a.nombre.trim().toLocaleLowerCase(),
                          ),
                      ),
                    );
                }}
              >
                <option value="simple">Simple · ficha y cantidad total</option>
                <option value="intermedio">Intermedio · características descriptivas</option>
                <option value="avanzado">Avanzado · modelo con combinaciones</option>
              </SelectField>
              <p className="field-hint">
                Elige el detalle para este producto, sea cual sea el rubro. Con variantes se cuenta
                cada combinación por separado.
              </p>
            </>
          )}
          {!parent && (
            <>
              {advanced && <h3>1. Datos generales del modelo</h3>}
              <CategorySelect
                value={category}
                onChange={(id) => {
                  setCategory(id);
                  if (
                    !rows.some((row) => row.original || cleanAttributes(row.caracteristicas).length)
                  ) {
                    setAxes(categoryDetails(categories.categories, id));
                  }
                }}
              />
              <Button type="button" variant="ghost" onClick={() => categories.setOpen(true)}>
                Administrar categorías
              </Button>
            </>
          )}
          {textFields.map(({ key, ...field }) => (
            <Field
              key={key}
              id={`product-${key}`}
              {...field}
              label={advanced && key === 'nombre' ? 'Nombre del producto o modelo' : field.label}
              value={values[key]}
              onChange={(event) => setValues({ ...values, [key]: event.target.value })}
            />
          ))}
          <CodeField
            id="product-codigo"
            label={advanced ? 'Código del modelo (opcional)' : 'Código (opcional)'}
            hint={
              advanced
                ? 'Si este código identifica el modelo, se elegirá después la combinación. Los códigos de tallas o colores concretos se registran en sus filas.'
                : undefined
            }
            value={values.codigo}
            onChange={(codigo) => setValues({ ...values, codigo })}
            disabled={action.busy}
          />
          {(parent || level !== 'simple' || attributes.some((a) => a.valor.trim())) && (
            <AttributesEditor
              value={attributes}
              onChange={setAttributes}
              variant={!!parent}
              title={advanced ? 'Características comunes del modelo' : undefined}
              description={
                advanced
                  ? 'Aquí van los datos que se repiten en todas las combinaciones, como marca o modelo. Lo que cambia de talla o color se completa abajo.'
                  : undefined
              }
            />
          )}
          {advanced && (
            <CombinationsEditor axes={axes} rows={rows} onAxes={setAxes} onRows={setRows} />
          )}
          {!advanced && (
            <>
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
            </>
          )}
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
            {advanced ? 'Guardar modelo y combinaciones' : 'Guardar producto'}
          </Button>
        </div>
      </form>
    </section>
  );
}

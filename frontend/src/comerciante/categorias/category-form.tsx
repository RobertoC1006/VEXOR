import { useState } from 'react';
import { api } from '../../compartido/api/api';
import { useAction } from '../../compartido/api/use-action';
import { Button, Field } from '../../compartido/componentes/ui';
import { SelectField } from '../../compartido/componentes/form-controls';
import { ActionFeedback } from '../../compartido/componentes/feedback';
import { useBusiness } from '../negocio/context';
import { DifferencesEditor } from '../productos/componentes/differences-editor';
import { categoryTemplates } from './templates';
import type { Category } from './categories';
import { CategoryPicker } from './category-picker';
export function CategoryForm({
  category,
  onSaved,
}: {
  category?: Category;
  onSaved: () => Promise<void>;
}) {
  const { base } = useBusiness();
  const [name, setName] = useState(category?.nombre ?? ''),
    [parent, setParent] = useState(category?.padre_id ?? '');
  const action = useAction();
  const [details, setDetails] = useState(category?.ejes_variantes ?? []);
  const [guide, setGuide] = useState(
    () =>
      categoryTemplates.find(
        (t) => JSON.stringify(t.detalles) === JSON.stringify(category?.ejes_variantes),
      )?.id ?? '',
  );
  return (
    <form
      className="settings-form"
      onSubmit={(e) => {
        e.preventDefault();
        void action.run(async () => {
          await api(`${base}/categorias${category ? `/${category.id}` : ''}`, {
            method: category ? 'PATCH' : 'POST',
            body: JSON.stringify({
              nombre: name.trim(),
              padre_id: parent || null,
              ejes_variantes: details.map((name) => name.trim()),
              ...(category ? { version: category.version } : {}),
            }),
          });
          await onSaved();
          if (!category) {
            setName('');
            setParent('');
            setDetails([]);
          }
        }, 'Categoría guardada. Ya puedes seleccionarla en el producto.');
      }}
    >
      <fieldset disabled={action.busy}>
        <Field
          id="category-name"
          label="Nombre de la categoría"
          autoFocus
          required
          maxLength={120}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <CategoryPicker value={parent} onChange={setParent} exclude={category?.id} />
        <details className="category-details">
          <summary>Detalles sugeridos para las combinaciones (opcional)</summary>
          <p className="field-hint">
            Elige una guía y edítala como necesites. Se usarán los nombres de estos campos; los
            valores los completas en cada producto. Sin detalles propios, se usan los de la
            categoría superior. Las fichas existentes conservan sus combinaciones.
          </p>
          <SelectField
            label="Elegir guía de detalles"
            value={guide}
            onChange={(e) => {
              const template = categoryTemplates.find((t) => t.id === e.target.value);
              setGuide(e.target.value);
              if (template) setDetails([...template.detalles]);
            }}
          >
            <option value="">Personalizar detalles</option>
            {categoryTemplates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nombre} · {t.detalles.join(', ')}
              </option>
            ))}
          </SelectField>
          <DifferencesEditor
            value={details}
            onChange={(value) => {
              setDetails(value);
              setGuide('');
            }}
          />
        </details>
      </fieldset>
      <ActionFeedback {...action} />
      <div className="form-actions">
        <Button busy={action.busy} disabled={!name.trim()} type="submit">
          Guardar categoría
        </Button>
      </div>
    </form>
  );
}

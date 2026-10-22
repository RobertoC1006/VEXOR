import { Modal } from '../../compartido/componentes/modal';
import { createContext, useContext, useState, type ReactNode } from 'react';
import { api, listAll } from '../../compartido/api/api';
import { useResource } from '../../compartido/api/use-resource';
import { useAction } from '../../compartido/api/use-action';
import { Button, Field, Notice } from '../../compartido/componentes/ui';
import { SelectField } from '../../compartido/componentes/form-controls';
import { ActionFeedback } from '../../compartido/componentes/feedback';
import { useBusiness } from '../negocio/context';
import { DifferencesEditor } from '../productos/componentes/differences-editor';
import { categoryTemplates } from './templates';

export interface Category {
  id: string;
  negocio_id: string;
  nombre: string;
  padre_id: string | null;
  version: number;
  ejes_variantes?: string[];
}
export function categoryPath(categories: Category[], id: string): string {
  const names: string[] = [],
    seen = new Set<string>();
  let category = categories.find((c) => c.id === id);
  while (category && !seen.has(category.id)) {
    seen.add(category.id);
    names.unshift(category.nombre);
    category = categories.find((c) => c.id === category!.padre_id);
  }
  return names.join(' → ');
}
const Context = createContext({
  categories: [] as Category[],
  loading: false,
  error: null as Error | null,
  refresh: async (): Promise<unknown> => undefined,
  open: false,
  setOpen: (_open: boolean) => {},
});
export const useCategories = () => useContext(Context);
export function CategoriesProvider({ children }: { children: ReactNode }) {
  const { base } = useBusiness();
  const resource = useResource(`${base}/categorias`, (signal) =>
    listAll<Category>(`${base}/categorias`, signal),
  );
  const [open, setOpen] = useState(false);
  return (
    <Context.Provider
      value={{
        categories: resource.data ?? [],
        loading: resource.loading,
        error: resource.error,
        refresh: resource.refresh,
        open,
        setOpen,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function CategorySelect({
  value,
  onChange,
  label = 'Categoría (opcional)',
  empty = 'Sin categoría',
  exclude,
}: {
  value: string;
  onChange: (id: string) => void;
  label?: string;
  empty?: string;
  exclude?: string;
}) {
  const { categories, loading, error } = useCategories();
  function permitted(category: Category) {
    let current: Category | undefined = category;
    const seen = new Set<string>();
    while (current && !seen.has(current.id)) {
      if (current.id === exclude) return false;
      seen.add(current.id);
      current = categories.find((c) => c.id === current!.padre_id);
    }
    return true;
  }
  const options = categories
    .filter(permitted)
    .map((c) => ({ id: c.id, path: categoryPath(categories, c.id) }))
    .sort((a, b) => a.path.localeCompare(b.path, 'es'));
  return (
    <SelectField
      label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={loading || !!error}
    >
      <option value="">{empty}</option>
      {value && !options.some((c) => c.id === value) && (
        <option value={value}>Categoría asignada</option>
      )}
      {options.map((c) => (
        <option key={c.id} value={c.id}>
          {c.path}
        </option>
      ))}
    </SelectField>
  );
}
export function CategoriesManager() {
  const { categories, open, setOpen, error, refresh } = useCategories();
  const { can } = useBusiness();
  const [selected, setSelected] = useState('');
  if (!open || !can('productos.gestionar')) return null;
  return (
    <Modal label="Administrar categorías" onClose={() => setOpen(false)}>
      <section className="panel settings-panel" aria-label="Administrar categorías">
        <div className="panel-heading compact">
          <h2>Categorías de tu negocio</h2>
        </div>
        <p className="field-hint">
          Agrupa tus productos como prefieras. Por ejemplo: Ropa interior → Mujer → Brasieres. Una
          categoría no tiene existencias propias.
        </p>
        {error ? (
          <>
            <Notice>{error.message}</Notice>
            <Button onClick={() => void refresh()}>Actualizar categorías</Button>
          </>
        ) : (
          <>
            <SelectField
              label="Categoría a editar"
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
            >
              <option value="">Crear nueva categoría</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {categoryPath(categories, c.id)}
                </option>
              ))}
            </SelectField>
            <CategoryForm
              key={selected}
              category={categories.find((c) => c.id === selected)}
              onSaved={async () => {
                await refresh();
                setSelected('');
              }}
            />
          </>
        )}
      </section>
    </Modal>
  );
}
function CategoryForm({
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
        <CategorySelect
          label="Dentro de"
          empty="Ninguna: categoría principal"
          value={parent}
          onChange={setParent}
          exclude={category?.id}
        />
        <h3>Detalles sugeridos para las combinaciones</h3>
        <p className="field-hint">
          Elige una guía y edítala como necesites. Se usarán los nombres de estos campos; los
          valores los completas en cada producto. Sin detalles propios, se usan los de la categoría
          superior. Las fichas existentes conservan sus combinaciones.
        </p>
        <SelectField
          label="Elegir guía de detalles"
          value=""
          onChange={(e) => {
            const template = categoryTemplates.find((t) => t.id === e.target.value);
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
        <DifferencesEditor value={details} onChange={setDetails} />
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

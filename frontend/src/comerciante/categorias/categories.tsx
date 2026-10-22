import { ChoiceCards } from '../../compartido/componentes/choice-cards';
import { CategoryForm } from './category-form';
import { categoryOptions } from './category-picker';
import { Modal } from '../../compartido/componentes/modal';
import { createContext, useContext, useState, type ReactNode } from 'react';
import { listAll } from '../../compartido/api/api';
import { useResource } from '../../compartido/api/use-resource';
import { Button, Notice } from '../../compartido/componentes/ui';
import { SelectField } from '../../compartido/componentes/form-controls';
import { useBusiness } from '../negocio/context';

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
  const [selected, setSelected] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  if (!open || !can('productos.gestionar')) return null;
  const category = categories.find((c) => c.id === selected);
  return (
    <Modal
      label="Categorías de tu negocio"
      onClose={() => {
        setOpen(false);
        setSelected(null);
      }}
    >
      {error ? (
        <>
          <Notice>{error.message}</Notice>
          <Button onClick={() => void refresh()}>Actualizar categorías</Button>
        </>
      ) : selected === null ? (
        <>
          <div className="category-heading">
            <p>Organiza tu catálogo. Selecciona una categoría para editarla o crea una nueva.</p>
            <Button
              onClick={() => {
                setSelected('new');
                setMessage('');
              }}
            >
              Nueva categoría
            </Button>
          </div>
          {message && <Notice tone="info">{message}</Notice>}
          <ChoiceCards
            options={categoryOptions(categories).map((c) => ({
              ...c,
              label: `Editar categoría ${c.label}`,
            }))}
            onChoose={setSelected}
          />
        </>
      ) : (
        <>
          <Button variant="ghost" onClick={() => setSelected(null)}>
            Volver a categorías
          </Button>
          <h2>{category ? 'Editar categoría' : 'Nueva categoría'}</h2>
          <CategoryForm
            key={selected}
            category={category}
            onSaved={async () => {
              await refresh();
              setSelected(null);
              setMessage('Categoría guardada. Ya puedes seleccionarla en el producto.');
            }}
          />
        </>
      )}
    </Modal>
  );
}

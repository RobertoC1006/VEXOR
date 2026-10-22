import { useState } from 'react';
import { Folder, ChevronRight } from 'lucide-react';
import { Modal } from '../../compartido/componentes/modal';
import { ChoiceCards } from '../../compartido/componentes/choice-cards';
import { categoryPath, useCategories, type Category } from './categories';

export function categoryOptions(categories: Category[], exclude?: string) {
  return categories
    .filter((c) => {
      const seen = new Set<string>();
      let current: Category | undefined = c;
      while (current && !seen.has(current.id)) {
        if (current.id === exclude) return false;
        seen.add(current.id);
        current = categories.find((p) => p.id === current!.padre_id);
      }
      return true;
    })
    .map((c) => ({
      id: c.id,
      title: c.nombre,
      description: c.padre_id ? categoryPath(categories, c.padre_id) : 'Categoría principal',
      label: categoryPath(categories, c.id),
    }))
    .sort((a, b) => a.label.localeCompare(b.label, 'es'));
}
export function CategoryPicker({
  value,
  onChange,
  exclude,
}: {
  value: string;
  onChange: (id: string) => void;
  exclude?: string;
}) {
  const { categories } = useCategories();
  const [open, setOpen] = useState(false);
  return (
    <div className="field">
      <span>Categoría superior (opcional)</span>
      <button
        type="button"
        className="category-picker"
        aria-label="Elegir categoría superior"
        onClick={() => setOpen(true)}
      >
        <Folder size={20} />
        <span>
          {value ? categoryPath(categories, value) : 'Categoría principal'}
          <small>{value ? 'Cambiar categoría superior' : 'Sin una categoría superior'}</small>
        </span>
        <ChevronRight size={18} />
      </button>
      {open && (
        <Modal label="Elegir categoría superior" onClose={() => setOpen(false)}>
          <ChoiceCards
            selected={value}
            options={[
              { id: '', title: 'Categoría principal', description: 'Crear sin categoría superior' },
              ...categoryOptions(categories, exclude),
            ]}
            onChoose={(id) => {
              onChange(id);
              setOpen(false);
            }}
          />
        </Modal>
      )}
    </div>
  );
}

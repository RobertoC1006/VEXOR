import { useId, useState } from 'react';
import { Check, Folder } from 'lucide-react';
import { Field } from './ui';
import { ClientPager, useClientPage } from './pagination';
export function ChoiceCards({
  options,
  selected,
  onChoose,
  searchLabel = 'Buscar categoría',
}: {
  options: { id: string; title: string; description: string; label?: string }[];
  selected?: string;
  onChoose: (id: string) => void;
  searchLabel?: string;
}) {
  const [search, setSearch] = useState('');
  const searchId = useId();
  const filtered = options.filter((o) =>
    `${o.title} ${o.description}`.toLocaleLowerCase('es').includes(search.toLocaleLowerCase('es')),
  );
  const page = useClientPage(filtered, search);
  return (
    <div className="choice-browser">
      <Field
        id={searchId}
        label={searchLabel}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <ClientPager page={page} />
      <div className="choice-card-grid">
        {page.items.map((o) => (
          <button
            type="button"
            key={o.id}
            className="choice-card"
            aria-label={o.label ?? o.title}
            aria-pressed={selected === o.id}
            onClick={() => onChoose(o.id)}
          >
            <span className="choice-card-icon">
              <Folder size={20} />
            </span>
            <span>
              <strong>{o.title}</strong>
              <small>{o.description}</small>
            </span>
            {selected === o.id && <Check size={18} />}
          </button>
        ))}
      </div>
      {!filtered.length && (
        <p className="field-hint">
          {options.length
            ? 'No hay opciones que coincidan. Prueba otro nombre.'
            : 'Aún no hay opciones disponibles.'}
        </p>
      )}
    </div>
  );
}

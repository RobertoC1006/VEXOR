import { ClientPager, useClientPage } from '../../../compartido/componentes/pagination';
import type { BusinessLocal } from '../types';
export function LocalTabs({
  locals,
  value,
  onChange,
}: {
  locals: BusinessLocal[];
  value: string;
  onChange: (id: string) => void;
}) {
  const page = useClientPage(locals);
  return (
    <section aria-label="Puesto o almacén">
      <p className="field-hint">Puesto o almacén</p>
      <ClientPager page={page} />
      <div className="location-tabs" role="group" aria-label="Elegir puesto o almacén">
        {page.items.map((local) => (
          <button
            type="button"
            key={local.id}
            aria-pressed={local.id === value}
            onClick={() => onChange(local.id)}
          >
            {local.nombre}
            {local.habilitado_venta ? '' : ' · Almacén'}
          </button>
        ))}
      </div>
    </section>
  );
}

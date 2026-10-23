import { useState } from 'react';
import { api } from '../../compartido/api/api';
import { useAction } from '../../compartido/api/use-action';
import { ActionFeedback } from '../../compartido/componentes/feedback';
import { Button, Field } from '../../compartido/componentes/ui';
import { SelectField } from '../../compartido/componentes/form-controls';
import { useBusiness } from './context';
import type { BusinessPreferences } from './preferences';
export function PreferencesForm() {
  const { business, base, refresh, can } = useBusiness();
  const prefs = business.preferencias;
  const [level, setLevel] = useState(prefs?.nivel_registro ?? 'simple'),
    [size, setSize] = useState(prefs?.elementos_por_pagina ?? 5),
    [attributes, setAttributes] = useState(
      (prefs?.caracteristicas ?? ['Marca', 'Modelo']).join(', '),
    ),
    [axes, setAxes] = useState((prefs?.ejes_variantes ?? ['Talla', 'Color']).join(', '));
  const action = useAction();
  const names = (s: string) =>
    s
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  return (
    <section className="panel onboarding-panel">
      <p className="muted">
        Tu plantilla es un punto de partida. Cada producto puede usar otros campos o un nivel
        distinto.
      </p>
      <form
        className="settings-form"
        onSubmit={(e) => {
          e.preventDefault();
          void action.run(async () => {
            const preferencias: BusinessPreferences = {
              nivel_registro: level,
              elementos_por_pagina: size,
              caracteristicas: names(attributes),
              ejes_variantes: names(axes),
            };
            await api(base, { method: 'PATCH', body: JSON.stringify({ preferencias }) });
            await refresh();
          }, 'Preferencias guardadas.');
        }}
      >
        <fieldset disabled={action.busy || !can('negocio.editar')}>
          <SelectField
            label="Nivel sugerido para productos nuevos"
            value={level}
            onChange={(e) => setLevel(e.target.value as typeof level)}
          >
            <option value="simple">Simple · ficha y cantidad</option>
            <option value="intermedio">Intermedio · características</option>
            <option value="avanzado">Avanzado · modelo y combinaciones</option>
          </SelectField>
          <Field
            id="preferred-attributes"
            label="Características comunes sugeridas"
            value={attributes}
            maxLength={800}
            onChange={(e) => setAttributes(e.target.value)}
          />
          <Field
            id="preferred-axes"
            label="Detalles sugeridos para combinaciones"
            value={axes}
            maxLength={800}
            onChange={(e) => setAxes(e.target.value)}
          />
          <p className="field-hint">
            Separa los nombres con comas. Ejemplo: Talla, Copa, Color. Cada nombre puede tener hasta
            40 caracteres.
          </p>
          <SelectField
            label="Elementos por página al abrir el catálogo"
            value={size}
            onChange={(e) => setSize(Number(e.target.value) as 5 | 10)}
          >
            <option value={5}>5 elementos</option>
            <option value={10}>10 elementos</option>
          </SelectField>
        </fieldset>
        <ActionFeedback {...action} />
        <div className="form-actions">
          {can('negocio.editar') ? (
            <Button busy={action.busy}>Guardar preferencias</Button>
          ) : (
            <p className="field-hint">
              Puedes consultar estas preferencias; el propietario puede modificarlas.
            </p>
          )}
        </div>
      </form>
    </section>
  );
}

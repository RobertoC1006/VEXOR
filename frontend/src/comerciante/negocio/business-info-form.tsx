import { useState } from 'react';
import { api } from '../../compartido/api/api';
import { useAction } from '../../compartido/api/use-action';
import { useWorkspace } from '../../compartido/acceso/workspace';
import { ActionFeedback } from '../../compartido/componentes/feedback';
import { Button, Field } from '../../compartido/componentes/ui';
import { ChoicePicker } from '../../compartido/componentes/choice-picker';
import { PhotoPicker } from '../../compartido/componentes/photo-picker';
import { useBusiness } from './context';
import { businessTemplates } from './preferences';
import type { BusinessDetail } from './types';
export function BusinessInfoForm({ onContinue }: { onContinue?: () => Promise<unknown> }) {
  const { business, base, can, refresh } = useBusiness();
  const { updateBusiness } = useWorkspace();
  const action = useAction();
  const [name, setName] = useState(business.nombre),
    [rubro, setRubro] = useState(business.rubro ?? ''),
    [description, setDescription] = useState(business.descripcion ?? ''),
    [photo, setPhoto] = useState<string | null | undefined>(),
    [preparing, setPreparing] = useState(false),
    [template, setTemplate] = useState<(typeof businessTemplates)[number] | null>(null);
  const changed =
    name.trim() !== business.nombre ||
    (rubro.trim() || null) !== (business.rubro ?? null) ||
    (description.trim() || null) !== (business.descripcion ?? null) ||
    photo !== undefined ||
    !!template;
  return (
    <section className="panel onboarding-panel">
      <div className="onboarding-panel-heading">
        {onContinue && <span className="step-number">1</span>}
        <div>
          <h2>{onContinue ? 'Cuéntanos sobre tu negocio' : 'Datos de tu negocio'}</h2>
          <p className="muted">
            {onContinue
              ? 'Empecemos por lo esencial. Después podrás ajustar los detalles.'
              : 'Actualiza tu información cuando lo necesites.'}
          </p>
        </div>
      </div>
      <form
        className="settings-form"
        onSubmit={(e) => {
          e.preventDefault();
          void action.run(async () => {
            const result = await api<BusinessDetail>(base, {
              method: 'PATCH',
              body: JSON.stringify({
                nombre: name.trim(),
                rubro: rubro.trim() || null,
                ...((description.trim() || null) !== (business.descripcion ?? null)
                  ? { descripcion: description.trim() || null }
                  : {}),
                ...(photo !== undefined ? { foto: photo } : {}),
                ...(template
                  ? {
                      preferencias: {
                        nivel_registro: template.level,
                        caracteristicas: template.attributes,
                        ejes_variantes: template.axes,
                      },
                    }
                  : {}),
              }),
            });
            updateBusiness(result.id, result.nombre);
            await refresh();
            setPhoto(undefined);
            setTemplate(null);
            await onContinue?.();
          }, 'Cambios guardados.');
        }}
      >
        <fieldset disabled={!can('negocio.editar') || action.busy}>
          <div className="onboarding-info-grid">
            <div>
              <Field
                id="business-name"
                label="Nombre del negocio"
                required
                maxLength={160}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <ChoicePicker
                label="Elegir rubro"
                value={businessTemplates.some((t) => t.id === rubro) ? rubro : 'otro'}
                onChange={(id) => {
                  const t = businessTemplates.find((t) => t.id === id);
                  setRubro(t?.id ?? '');
                  setTemplate(t ?? null);
                }}
                options={[
                  ...businessTemplates.map((t) => ({
                    id: t.id,
                    title: t.name,
                    description: `Plantilla sugerida: ${t.axes.join(', ')}`,
                  })),
                  {
                    id: 'otro',
                    title: 'Otro rubro o varios rubros',
                    description: 'Personaliza tus campos y tu nivel de registro',
                  },
                ]}
              />
              <Field
                id="business-rubro"
                label="Rubro del negocio"
                required={!!onContinue}
                maxLength={120}
                value={rubro}
                placeholder="Escribe o adapta tu rubro"
                onChange={(e) => {
                  setRubro(e.target.value);
                  setTemplate(null);
                }}
              />
              <Field
                id="business-description"
                label="Descripción del negocio (opcional)"
                maxLength={1000}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <PhotoPicker
              label="Logo o foto del negocio"
              value={photo}
              initialPhoto={
                business.foto ? (
                  <img className="product-photo" src={business.foto} alt={business.nombre} />
                ) : undefined
              }
              onChange={setPhoto}
              onBusyChange={setPreparing}
            />
          </div>
          {template && (
            <div className="template-preview">
              <strong>Plantilla de {template.name}</strong>
              <p>Datos comunes: {template.attributes.join(', ')}.</p>
              <p>Combinaciones sugeridas: {template.axes.join(', ')}.</p>
              <small>
                Tendrás campos sugeridos para empezar. Más adelante podrás adaptarlos en Mi negocio.
              </small>
            </div>
          )}
        </fieldset>
        <ActionFeedback {...action} />
        <div className="form-actions">
          {can('negocio.editar') && (
            <Button
              type="submit"
              busy={action.busy}
              disabled={
                !name.trim() ||
                (!!onContinue && !rubro.trim()) ||
                (!onContinue && !changed) ||
                preparing
              }
            >
              {onContinue ? 'Siguiente' : 'Guardar cambios'}
            </Button>
          )}
        </div>
        {onContinue && (
          <p className="field-hint">Al continuar guardamos este paso para que puedas retomarlo.</p>
        )}
      </form>
    </section>
  );
}

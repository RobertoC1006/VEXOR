import { useState, type FormEvent } from 'react';
import { api } from '../../../compartido/api/api';
import { useAction } from '../../../compartido/api/use-action';
import { Button, Field, Notice } from '../../../compartido/componentes/ui';
import { SelectField } from '../../../compartido/componentes/form-controls';
import { ActionFeedback } from '../../../compartido/componentes/feedback';
import { useBusiness } from '../../negocio/context';
import type { BusinessLocal } from '../../locales/types';
import type { IndividualPermission, Permission } from '../types';
import { localDateInput, permissionLabel } from '../permissions';

export function PermissionEditor({
  memberId,
  permission,
  permissions,
  locals,
  onSaved,
  onCancel,
}: {
  memberId: string;
  permission?: IndividualPermission;
  permissions: Permission[];
  locals: BusinessLocal[];
  onSaved: () => Promise<unknown>;
  onCancel: () => void;
}) {
  const { base } = useBusiness();
  const action = useAction();
  const [code, setCode] = useState(permission?.permiso_codigo ?? ''),
    [effect, setEffect] = useState<'permitir' | 'denegar'>(permission?.efecto ?? 'permitir'),
    [local, setLocal] = useState(permission?.local_id ?? ''),
    [start, setStart] = useState(localDateInput(permission?.inicia_en ?? null)),
    [end, setEnd] = useState(localDateInput(permission?.vence_en ?? null)),
    [reason, setReason] = useState(permission?.motivo ?? ''),
    [validation, setValidation] = useState('');
  const definition = permissions.find((item) => item.codigo === code);
  async function save(event: FormEvent) {
    event.preventDefault();
    setValidation('');
    if (start && end && new Date(end).getTime() <= new Date(start).getTime()) {
      setValidation('El vencimiento debe ser posterior al inicio.');
      return;
    }
    const body = {
      efecto: effect,
      motivo: reason.trim() || null,
      vence_en: end
        ? end === localDateInput(permission?.vence_en ?? null)
          ? permission!.vence_en
          : new Date(end).toISOString()
        : null,
      ...(start
        ? start === localDateInput(permission?.inicia_en ?? null)
          ? {}
          : { inicia_en: new Date(start).toISOString() }
        : {}),
      ...(!permission
        ? { permiso_codigo: code, local_id: definition?.alcance === 'local' ? local || null : null }
        : {}),
    };
    const ok = await action.run(
      () =>
        api(`${base}/miembros/${memberId}/permisos${permission ? `/${permission.id}` : ''}`, {
          method: permission ? 'PATCH' : 'POST',
          body: JSON.stringify(body),
        }),
      'Permiso individual guardado.',
    );
    if (ok) await onSaved();
  }
  return (
    <section className="settings-divider">
      <h3>{permission ? 'Editar permiso individual' : 'Nuevo permiso individual'}</h3>
      <form className="settings-form" onSubmit={save}>
        <fieldset disabled={action.busy}>
          <SelectField
            label="Acción"
            value={code}
            required
            onChange={(event) => {
              setCode(event.target.value);
              setLocal('');
            }}
            disabled={Boolean(permission) || action.busy}
          >
            <option value="">Selecciona una acción</option>
            {permissions.map((item) => (
              <option key={item.codigo} value={item.codigo}>
                {permissionLabel(item)}
              </option>
            ))}
          </SelectField>
          <SelectField
            label="Efecto"
            value={effect}
            onChange={(event) => setEffect(event.target.value as 'permitir' | 'denegar')}
          >
            <option value="permitir">Permitir esta acción</option>
            <option value="denegar">Denegar esta acción</option>
          </SelectField>
          {definition?.alcance === 'local' && (
            <SelectField
              label="Local del permiso"
              value={local}
              onChange={(event) => setLocal(event.target.value)}
              disabled={Boolean(permission) || action.busy}
            >
              <option value="">Todos sus locales autorizados</option>
              {locals.map((item) => (
                <option value={item.id} key={item.id}>
                  {item.nombre}
                  {item.activo ? '' : ' (pausado)'}
                </option>
              ))}
            </SelectField>
          )}
          <div className="form-grid">
            <Field
              id="permission-start"
              label="Inicio (hora de este dispositivo)"
              type="datetime-local"
              step="1"
              value={start}
              required={Boolean(permission)}
              onChange={(event) => setStart(event.target.value)}
            />
            <Field
              id="permission-end"
              label="Vencimiento (hora de este dispositivo)"
              type="datetime-local"
              step="1"
              value={end}
              onChange={(event) => setEnd(event.target.value)}
            />
          </div>
          <p className="field-hint">
            Si no indicas inicio, se aplica desde que se guarda. Sin vencimiento, permanece hasta
            que lo revoques.
          </p>
          <Field
            id="permission-reason"
            label="Motivo (opcional)"
            value={reason}
            maxLength={500}
            onChange={(event) => setReason(event.target.value)}
          />
        </fieldset>
        {validation && <Notice>{validation}</Notice>}
        <ActionFeedback {...action} />
        <div className="form-actions">
          <Button type="button" variant="secondary" onClick={onCancel} disabled={action.busy}>
            Cancelar
          </Button>
          <Button busy={action.busy} disabled={!code}>
            Guardar permiso
          </Button>
        </div>
      </form>
    </section>
  );
}

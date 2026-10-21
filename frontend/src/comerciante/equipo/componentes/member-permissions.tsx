import { useState } from 'react';
import { api } from '../../../compartido/api/api';
import { useAction } from '../../../compartido/api/use-action';
import { Button } from '../../../compartido/componentes/ui';
import { ActionFeedback } from '../../../compartido/componentes/feedback';
import { ConfirmationDialog } from '../../../compartido/componentes/confirmation-dialog';
import { useBusiness } from '../../negocio/context';
import type { BusinessLocal } from '../../locales/types';
import type { IndividualPermission, Member, Permission } from '../types';
import { PermissionEditor } from './permission-editor';
import { permissionLabel, permissionState } from '../permissions';

export function MemberPermissions({
  member,
  permissions,
  grants,
  locals,
  onSaved,
}: {
  member: Member;
  permissions: Permission[];
  grants: IndividualPermission[];
  locals: BusinessLocal[];
  onSaved: () => Promise<unknown>;
}) {
  const { base, access, business } = useBusiness();
  const [editor, setEditor] = useState<IndividualPermission | 'new' | null>(null),
    [revoke, setRevoke] = useState<IndividualPermission | null>(null);
  const action = useAction();
  async function revokePermission() {
    if (!revoke) return;
    const ok = await action.run(async () => {
      await api(`${base}/miembros/${member.id}/permisos/${revoke.id}/revocar`, { method: 'POST' });
      setRevoke(null);
      await onSaved();
    }, 'Permiso individual revocado.');
    if (!ok) setRevoke(null);
  }
  const format = (value: string) =>
    new Intl.DateTimeFormat('es-PE', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: business.zona_horaria,
    }).format(new Date(value));
  return (
    <section className="panel settings-panel">
      <div className="panel-heading compact">
        <h2>Permisos individuales</h2>
        {access.es_propietario && (
          <Button variant="secondary" onClick={() => setEditor('new')}>
            Añadir permiso
          </Button>
        )}
      </div>
      <p className="muted">
        Permite una acción concreta o deniégala aunque un rol la conceda. Revocar una excepción
        conserva los permisos que otorguen otros roles.
      </p>
      <ActionFeedback {...action} />
      {grants.length ? (
        <div className="assignment-list">
          {grants.map((grant) => (
            <article className="permission-row" key={grant.id}>
              <div className="settings-row-main">
                <div className="permission-title">
                  <strong>
                    {(() => {
                      const permission = permissions.find(
                        (item) => item.codigo === grant.permiso_codigo,
                      );
                      return permission ? permissionLabel(permission) : grant.permiso_codigo;
                    })()}
                  </strong>
                  <span className={`badge ${grant.efecto === 'denegar' ? 'neutral' : ''}`}>
                    {grant.efecto === 'permitir' ? 'Permitir' : 'Denegar'}
                  </span>
                  <span className="badge neutral">{permissionState(grant)}</span>
                </div>
                <p>
                  {grant.local_id
                    ? (locals.find((local) => local.id === grant.local_id)?.nombre ??
                      'Local sin acceso')
                    : 'Ámbito autorizado del negocio'}
                </p>
                <p>
                  Desde {format(grant.inicia_en)}
                  {grant.vence_en ? ` · Hasta ${format(grant.vence_en)}` : ' · Sin vencimiento'}
                </p>
                {grant.motivo && <p>Motivo: {grant.motivo}</p>}
              </div>
              {access.es_propietario && !grant.revocado_en && (
                <div className="row-actions">
                  <Button variant="ghost" onClick={() => setEditor(grant)} disabled={action.busy}>
                    Editar
                  </Button>
                  <Button variant="ghost" onClick={() => setRevoke(grant)} disabled={action.busy}>
                    Revocar
                  </Button>
                </div>
              )}
            </article>
          ))}
        </div>
      ) : (
        <p className="empty-inline">
          No hay permisos individuales. Se aplican sus roles y locales asignados.
        </p>
      )}
      {editor && (
        <PermissionEditor
          key={editor === 'new' ? 'new' : editor.id}
          memberId={member.id}
          permission={editor === 'new' ? undefined : editor}
          permissions={permissions}
          locals={locals}
          onCancel={() => setEditor(null)}
          onSaved={async () => {
            setEditor(null);
            await onSaved();
          }}
        />
      )}
      {revoke && (
        <ConfirmationDialog
          title="Revocar permiso individual"
          description={`Esta excepción dejará de aplicarse a ${member.nombre}. Los permisos de sus roles y las demás excepciones seguirán evaluándose.`}
          confirmLabel="Revocar permiso"
          busy={action.busy}
          onConfirm={revokePermission}
          onCancel={() => setRevoke(null)}
        />
      )}
    </section>
  );
}

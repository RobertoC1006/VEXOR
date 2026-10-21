import { useState } from 'react';
import { api, listAll } from '../../../compartido/api/api';
import { useResource } from '../../../compartido/api/use-resource';
import { useAction } from '../../../compartido/api/use-action';
import { Button, Empty, Notice } from '../../../compartido/componentes/ui';
import {
  ActionFeedback,
  PageHeading,
  ResourceState,
} from '../../../compartido/componentes/feedback';
import { ConfirmationDialog } from '../../../compartido/componentes/confirmation-dialog';
import {
  invitationLabels,
  invitationState,
  shortDate,
} from '../../../compartido/invitaciones/status';
import type { ManagedInvitation } from '../../../compartido/invitaciones/types';
import { useBusiness } from '../../negocio/context';
import { TeamInvitationForm } from '../componentes/team-invitation-form';

export function TeamInvitationsPage() {
  const { access } = useBusiness();
  return access.es_propietario ? (
    <ManageInvitations />
  ) : (
    <Notice>Las invitaciones del equipo las gestiona el propietario del negocio.</Notice>
  );
}
function ManageInvitations() {
  const { base, business } = useBusiness();
  const resource = useResource(`${base}/invitaciones`, (signal) =>
    listAll<ManagedInvitation>(`${base}/invitaciones`, signal),
  );
  const action = useAction();
  const [confirmation, setConfirmation] = useState<{
    invitation: ManagedInvitation;
    kind: 'reenviar' | 'revocar';
  } | null>(null);
  async function confirm() {
    if (!confirmation) return;
    const current = confirmation;
    await action.run(
      async () => {
        const result = await api<ManagedInvitation>(
          `${base}/invitaciones/${current.invitation.id}/${current.kind}`,
          { method: 'POST' },
        );
        await resource.refresh();
        if (current.kind === 'reenviar' && result.estado_envio !== 'enviado')
          throw new Error(
            'El correo no pudo enviarse. La invitación sigue guardada; contacta con VEXOR si el problema continúa.',
          );
      },
      current.kind === 'revocar' ? 'Invitación revocada.' : 'Correo aceptado para envío.',
    );
    setConfirmation(null);
  }
  if (!resource.data) return <ResourceState error={resource.error} retry={resource.refresh} />;
  return (
    <>
      <PageHeading
        title="Invitaciones del equipo"
        description="Incorpora personas y revisa sus invitaciones pendientes."
      />
      <TeamInvitationForm onSaved={resource.refresh} />
      <ActionFeedback {...action} />
      <section className="panel">
        <div className="panel-heading">
          <h2>
            Invitaciones registradas <span className="count">{resource.data.length}</span>
          </h2>
          <Button variant="ghost" onClick={() => void resource.refresh()}>
            Actualizar
          </Button>
        </div>
        {resource.data.length ? (
          <div className="settings-list">
            {resource.data.map((invitation) => (
              <article className="settings-row" key={invitation.id}>
                <div className="settings-row-main">
                  <h3>{invitation.nombre}</h3>
                  <p>{invitation.email}</p>
                  <p>
                    Disponible hasta {shortDate(invitation.vence_en, business.zona_horaria)}
                    {invitationState(invitation) === 'pendiente'
                      ? ` · ${invitation.estado_envio === 'enviado' ? 'Correo aceptado para envío' : invitation.estado_envio === 'enviando' ? 'Envío en curso' : 'Correo pendiente de envío'}`
                      : ''}
                  </p>
                </div>
                <span
                  className={`badge ${invitationState(invitation) === 'aceptada' ? 'success' : 'neutral'}`}
                >
                  {invitationLabels[invitationState(invitation)]}
                </span>
                {!invitation.aceptada_en && !invitation.revocada_en && (
                  <div className="row-actions">
                    {invitationState(invitation) === 'pendiente' && (
                      <Button
                        variant="ghost"
                        disabled={action.busy}
                        onClick={() => setConfirmation({ invitation, kind: 'reenviar' })}
                      >
                        Reenviar<span className="visually-hidden"> a {invitation.nombre}</span>
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      disabled={action.busy}
                      onClick={() => setConfirmation({ invitation, kind: 'revocar' })}
                    >
                      Revocar
                      <span className="visually-hidden"> invitación de {invitation.nombre}</span>
                    </Button>
                  </div>
                )}
              </article>
            ))}
          </div>
        ) : (
          <Empty title="Invita a la primera persona">
            Las invitaciones de este negocio aparecerán aquí. Nadie recibe permisos ni locales
            automáticamente.
          </Empty>
        )}
      </section>
      {confirmation && (
        <ConfirmationDialog
          title={confirmation.kind === 'reenviar' ? 'Reenviar invitación' : 'Revocar invitación'}
          description={
            confirmation.kind === 'reenviar'
              ? `Se intentará enviar de nuevo a ${confirmation.invitation.email}. Debe pasar al menos un minuto entre reenvíos.`
              : `${confirmation.invitation.nombre} ya no podrá usar esta invitación. Si alguien ya tiene acceso, se gestiona desde su ficha del equipo.`
          }
          confirmLabel={confirmation.kind === 'reenviar' ? 'Reenviar' : 'Revocar invitación'}
          busy={action.busy}
          onConfirm={confirm}
          onCancel={() => setConfirmation(null)}
        />
      )}
    </>
  );
}

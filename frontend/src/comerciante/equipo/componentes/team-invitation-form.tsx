import { useState, type FormEvent } from 'react';
import { useWorkspace } from '../../../compartido/acceso/workspace';
import { useInvitationRequest } from '../../../compartido/invitaciones/use-invitation-request';
import { useAction } from '../../../compartido/api/use-action';
import { Button, Field, Notice } from '../../../compartido/componentes/ui';
import { ActionFeedback } from '../../../compartido/componentes/feedback';
import type { ManagedInvitation } from '../../../compartido/invitaciones/types';
import { useBusiness } from '../../negocio/context';

export function TeamInvitationForm({ onSaved }: { onSaved: () => Promise<unknown> }) {
  const { base } = useBusiness();
  const { data } = useWorkspace();
  const request = useInvitationRequest<{ nombre: string; email: string }>(
    `vexor:team-invitation:${data!.me.auth_user_id}:${base}`,
  );
  const [name, setName] = useState(request.pending?.body.nombre ?? ''),
    [email, setEmail] = useState(request.pending?.body.email ?? ''),
    [result, setResult] = useState<ManagedInvitation | null>(null);
  const action = useAction();
  async function send(event: FormEvent) {
    event.preventDefault();
    setResult(null);
    await action.run(async () => {
      const invitation = await request.send<ManagedInvitation>(`${base}/invitaciones`, {
        nombre: name.trim(),
        email: email.trim().toLowerCase(),
      });
      setResult(invitation);
      setName('');
      setEmail('');
      await onSaved();
    }, 'Invitación guardada.');
  }
  return (
    <section className="panel settings-panel">
      <h2>Invitar a tu equipo</h2>
      <p className="muted">
        La persona acepta con su propia cuenta. Después podrás asignarle locales, roles y permisos.
      </p>
      <form className="settings-form" onSubmit={send}>
        <fieldset disabled={action.busy || Boolean(request.pending)}>
          <div className="form-grid">
            <Field
              id="team-invitation-name"
              label="Nombre de la persona"
              required
              maxLength={120}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <Field
              id="team-invitation-email"
              label="Correo de invitación"
              type="email"
              required
              maxLength={254}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
        </fieldset>
        {request.pending && (
          <Notice tone="info">
            Hay un intento pendiente de respuesta. Al reintentar se conserva la misma solicitud para
            evitar duplicarla.
          </Notice>
        )}
        <ActionFeedback error={action.error} message="" />
        {result && (
          <Notice tone={result.estado_envio === 'enviado' ? 'success' : 'info'}>
            {result.estado_envio === 'enviado'
              ? 'Invitación guardada y correo aceptado para envío. El acceso se crea cuando la persona acepta.'
              : 'La invitación quedó guardada, pero el correo no pudo enviarse. Reintenta el envío desde la lista o contacta con VEXOR.'}
          </Notice>
        )}
        <Button busy={action.busy} disabled={!name.trim() || !email.trim()}>
          {request.pending ? 'Reintentar invitación' : 'Enviar invitación'}
        </Button>
      </form>
    </section>
  );
}

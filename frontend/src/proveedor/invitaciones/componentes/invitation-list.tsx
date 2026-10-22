import { Modal } from '../../../compartido/componentes/modal';
import { useClientPage, ClientPager } from '../../../compartido/componentes/pagination';
import { useState } from 'react';
import { Building2, MoreHorizontal, RefreshCw, X } from 'lucide-react';
import { api, ApiError } from '../../../compartido/api/api';
import { invitationLabels, invitationState, platformPath, shortDate } from '../platform';
import type { PlatformInvitation } from '../types';
import { usePlatform } from '../../estado/platform';
import { Button, Empty, Notice } from '../../../compartido/componentes/ui';

export function InvitationStatus({ invitation }: { invitation: PlatformInvitation }) {
  const status = invitationState(invitation);
  return (
    <span
      className={`badge ${status === 'aceptada' ? 'success' : status === 'pendiente' ? '' : 'neutral'}`}
    >
      {invitationLabels[status]}
    </span>
  );
}
export function InvitationList({
  items,
  manage = false,
  completed = false,
}: {
  items: PlatformInvitation[];
  manage?: boolean;
  completed?: boolean;
}) {
  const { reload } = usePlatform();
  const page = useClientPage(items, items.map((i) => i.id).join(','));
  const [action, setAction] = useState<{
      invitation: PlatformInvitation;
      kind: 'reenviar' | 'revocar';
    } | null>(null),
    [expanded, setExpanded] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [message, setMessage] = useState('');
  async function confirm() {
    if (!action) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const result = await api<PlatformInvitation>(
        `${platformPath}/${action.invitation.id}/${action.kind}`,
        { method: 'POST' },
      );
      setMessage(
        action.kind === 'revocar'
          ? 'Invitación revocada. Si ya había sido aceptada, el acceso existente no cambia.'
          : result.estado_envio === 'enviado'
            ? 'El proveedor aceptó el correo de invitación.'
            : 'La solicitud sigue guardada, pero el correo no pudo enviarse. Revisa la configuración de correo antes de reintentar.',
      );
      setAction(null);
      setExpanded('');
      await reload(true);
    } catch (e) {
      setError(
        e instanceof ApiError && e.status === 409
          ? 'El estado cambió o todavía no puedes reenviar. Actualiza y espera al menos un minuto antes de reintentar.'
          : (e as Error).message,
      );
    } finally {
      setBusy(false);
    }
  }
  if (!items.length)
    return (
      <Empty
        title={
          completed ? 'Las primeras altas aparecerán aquí' : 'No hay invitaciones en esta vista'
        }
      >
        {completed
          ? 'Un negocio se incorpora cuando su propietario acepta la invitación.'
          : 'Registra un negocio o cambia los filtros para encontrar una solicitud.'}
      </Empty>
    );
  return (
    <>
      <ClientPager page={page} />
      {message && <Notice tone="info">{message}</Notice>}
      <div
        className="platform-list"
        role="list"
        aria-label={completed ? 'Altas completadas' : 'Invitaciones de negocios'}
      >
        <div className={`platform-list-heading ${manage ? 'with-actions' : ''}`} aria-hidden="true">
          <span>Negocio</span>
          <span>Propietario invitado</span>
          <span>{completed ? 'Fecha de alta' : 'Estado'}</span>
          <span>{completed ? 'Resultado' : 'Correo'}</span>
          {manage && <span>Acciones</span>}
        </div>
        {page.items.map((i) => {
          const pending = invitationState(i) === 'pendiente';
          return (
            <article
              className={`platform-row ${manage ? 'with-actions' : ''}`}
              role="listitem"
              key={i.id}
            >
              <div className="platform-business">
                <span className="icon-tile">
                  <Building2 size={20} />
                </span>
                <div>
                  <h3>{i.negocio_nombre}</h3>
                  <small>
                    {completed ? 'Alta por invitación' : `Solicitud del ${shortDate(i.creado_en)}`}
                  </small>
                </div>
              </div>
              <div className="platform-contact">
                <strong>{i.nombre}</strong>
                <span>{i.email}</span>
              </div>
              <div className="platform-status">
                {completed ? (
                  <span>{shortDate(i.aceptada_en!)}</span>
                ) : (
                  <InvitationStatus invitation={i} />
                )}
              </div>
              <div className="platform-mail">
                {completed ? (
                  <InvitationStatus invitation={i} />
                ) : invitationState(i) === 'aceptada' ? (
                  <span>Acceso confirmado</span>
                ) : (
                  <span className={i.estado_envio === 'error' ? 'mail-error' : ''}>
                    {
                      {
                        enviado: 'Aceptado por el proveedor',
                        pendiente: 'Por enviar',
                        enviando: 'En proceso',
                        error: 'Envío no completado',
                      }[i.estado_envio]
                    }
                  </span>
                )}
              </div>
              {manage && (
                <div className="platform-actions">
                  {pending ? (
                    <>
                      <button
                        className="icon-button"
                        aria-label={`Acciones de ${i.negocio_nombre}`}
                        aria-expanded={expanded === i.id}
                        onClick={() => setExpanded(expanded === i.id ? '' : i.id)}
                      >
                        <MoreHorizontal size={21} />
                      </button>
                      {expanded === i.id && (
                        <div className="invitation-actions">
                          <Button
                            variant="secondary"
                            onClick={() => {
                              setAction({ invitation: i, kind: 'reenviar' });
                              setError('');
                              setMessage('');
                            }}
                          >
                            Reenviar correo
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() => {
                              setAction({ invitation: i, kind: 'revocar' });
                              setError('');
                              setMessage('');
                            }}
                          >
                            Revocar invitación
                          </Button>
                        </div>
                      )}
                    </>
                  ) : (
                    <span className="muted">Sin acciones</span>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </div>
      {action && (
        <Modal label="Revisar invitación" busy={busy} onClose={() => setAction(null)}>
          <section
            tabIndex={-1}
            className="confirmation-panel"
            aria-labelledby="confirm-invitation-title"
          >
            <div>
              <h2 id="confirm-invitation-title">
                {action.kind === 'reenviar'
                  ? '¿Reenviar esta invitación?'
                  : '¿Revocar esta invitación?'}
              </h2>
              <p>
                <strong>{action.invitation.negocio_nombre}</strong> · {action.invitation.email}
              </p>
              <p>
                {action.kind === 'reenviar'
                  ? 'Se enviará otro correo al destinatario. El reenvío no modifica su cuenta ni su contraseña.'
                  : 'La invitación pendiente dejará de permitir una nueva incorporación. No elimina un negocio ni una membresía existente.'}
              </p>
            </div>
            {error && <Notice>{error}</Notice>}
            <div className="actions">
              <Button variant="secondary" disabled={busy} onClick={() => setAction(null)}>
                <X size={16} /> Cancelar
              </Button>
              <Button busy={busy} onClick={() => void confirm()}>
                {action.kind === 'reenviar' ? <RefreshCw size={16} /> : null}
                {action.kind === 'reenviar' ? 'Confirmar reenvío' : 'Confirmar revocación'}
              </Button>
            </div>
          </section>
        </Modal>
      )}
    </>
  );
}

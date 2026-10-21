import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Building2, Mail, Send } from 'lucide-react';
import { Button, Field, Notice } from '../../../compartido/componentes/ui';
import { ApiError } from '../../../compartido/api/api';
import { platformPath } from '../platform';
import type { PlatformInvitation } from '../types';
import { useWorkspace } from '../../../compartido/acceso/workspace';
import { usePlatform } from '../../estado/platform';
import { useInvitationRequest } from '../../../compartido/invitaciones/use-invitation-request';
interface Draft {
  email: string;
  nombre: string;
  negocio_nombre: string;
  zona_horaria: string;
}
export function NewBusinessInvitationPage() {
  const { data } = useWorkspace(),
    { reload } = usePlatform(),
    navigate = useNavigate();
  const storageKey = `vexor:platform-invitation:${data!.me.auth_user_id}`;
  const request = useInvitationRequest<Draft>(storageKey);
  const { pending } = request;
  const [draft, setDraft] = useState<Draft>(
      pending?.body ?? { email: '', nombre: '', negocio_nombre: '', zona_horaria: 'America/Lima' },
    ),
    [review, setReview] = useState(Boolean(pending)),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [result, setResult] = useState<PlatformInvitation | null>(null);
  function prepare(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const clean = {
      ...draft,
      email: draft.email.trim().toLowerCase(),
      nombre: draft.nombre.trim(),
      negocio_nombre: draft.negocio_nombre.trim(),
    };
    if (!clean.nombre || !clean.negocio_nombre) {
      setError('Completa el nombre del negocio y del propietario.');
      return;
    }
    setDraft(clean);
    setError('');
    setReview(true);
  }
  async function send() {
    setBusy(true);
    setError('');
    try {
      const invitation = await request.send<PlatformInvitation>(platformPath, draft);
      setResult(invitation);
      void reload(true);
    } catch (e) {
      setError(
        e instanceof ApiError && e.status === 409
          ? 'Esta solicitud entra en conflicto con otra o cambió su estado. Revisa las invitaciones antes de crear una nueva.'
          : (e as Error).message,
      );
    } finally {
      setBusy(false);
    }
  }
  if (result)
    return (
      <>
        <div className="page-heading">
          <div>
            <span className="eyebrow">SOLICITUD REGISTRADA</span>
            <h1>La invitación quedó guardada.</h1>
            <p>{result.negocio_nombre}</p>
          </div>
        </div>
        <section className="panel platform-result">
          <span className="icon-tile">
            <Mail size={30} />
          </span>
          <h2>
            {result.estado_envio === 'enviado'
              ? 'El proveedor aceptó el correo.'
              : 'Revisa el envío del correo.'}
          </h2>
          <p>
            Destinatario: <strong>{result.email}</strong>
          </p>
          <Notice tone={result.estado_envio === 'enviado' ? 'success' : 'info'}>
            {result.estado_envio === 'enviado'
              ? 'El propietario recibirá un enlace para confirmar su acceso y aceptar la invitación.'
              : 'La solicitud está registrada, pero el envío no quedó confirmado. Revisa la configuración de correo y su estado en Invitaciones.'}
          </Notice>
          <p>
            El negocio se incorpora cuando el propietario acepta. Esta solicitud no te convierte en
            miembro del negocio.
          </p>
          <Button
            onClick={() => {
              navigate('/plataforma/invitaciones');
            }}
          >
            Ver invitaciones <ArrowRight size={17} />
          </Button>
        </section>
      </>
    );
  return (
    <>
      <Link className="platform-back" to="/plataforma/invitaciones">
        <ArrowLeft size={16} /> Volver a invitaciones
      </Link>
      <div className="page-heading">
        <div>
          <span className="eyebrow">NUEVO NEGOCIO</span>
          <h1>{review ? 'Revisa la invitación' : 'Invita a su propietario'}</h1>
          <p>Una invitación personal para incorporar un negocio a VEXOR.</p>
        </div>
      </div>
      <div className="platform-form-grid">
        <section className="panel">
          <div className="panel-heading">
            <h2>{review ? 'Datos de la solicitud' : 'Información del negocio'}</h2>
          </div>
          {review ? (
            <>
              <dl className="info-list">
                <div>
                  <dt>Negocio</dt>
                  <dd>{draft.negocio_nombre}</dd>
                </div>
                <div>
                  <dt>Propietario invitado</dt>
                  <dd>{draft.nombre}</dd>
                </div>
                <div>
                  <dt>Correo de destino</dt>
                  <dd>{draft.email}</dd>
                </div>
                <div>
                  <dt>Zona horaria</dt>
                  <dd>America/Lima</dd>
                </div>
              </dl>
              {pending && !busy && (
                <Notice tone="info">
                  Hay una solicitud pendiente de confirmar. Al reintentar se verifica si ya quedó
                  registrada para evitar duplicados. Revisa también Invitaciones.
                </Notice>
              )}
              {error && <Notice>{error}</Notice>}
              <div className="actions">
                <Button
                  variant="secondary"
                  disabled={busy || !!pending}
                  onClick={() => setReview(false)}
                >
                  Editar datos
                </Button>
                <Button busy={busy} onClick={() => void send()}>
                  <Send size={17} />
                  {busy
                    ? 'Guardando invitación…'
                    : pending
                      ? 'Reintentar la misma solicitud'
                      : 'Confirmar y enviar invitación'}
                </Button>
              </div>
            </>
          ) : (
            <form className="platform-form" onSubmit={prepare}>
              {error && <Notice>{error}</Notice>}
              <Field
                id="business-name"
                label="Nombre del negocio"
                value={draft.negocio_nombre}
                maxLength={160}
                required
                onChange={(e) => setDraft({ ...draft, negocio_nombre: e.target.value })}
                placeholder="Ej. Comercial La Aurora"
              />
              <Field
                id="owner-name"
                label="Nombre del propietario"
                value={draft.nombre}
                maxLength={120}
                required
                autoComplete="name"
                onChange={(e) => setDraft({ ...draft, nombre: e.target.value })}
                placeholder="Nombre y apellidos"
              />
              <Field
                id="owner-email"
                label="Correo del propietario"
                value={draft.email}
                maxLength={254}
                required
                type="email"
                autoComplete="email"
                onChange={(e) => setDraft({ ...draft, email: e.target.value })}
                placeholder="propietario@correo.com"
              />
              <div className="actions">
                <Link className="button secondary" to="/plataforma/invitaciones">
                  Cancelar
                </Link>
                <Button type="submit">
                  Revisar invitación <ArrowRight size={17} />
                </Button>
              </div>
            </form>
          )}
        </section>
        <aside className="panel platform-form-help">
          <span className="icon-tile">
            <Building2 size={28} />
          </span>
          <h2>Un acceso propio para cada negocio</h2>
          <p>El propietario confirma su correo y acepta la invitación para completar el alta.</p>
          <p>Si ya tiene una cuenta, conserva su correo y contraseña. No se crea otra identidad.</p>
          <p>VEXOR administra la incorporación; el propietario administra su negocio.</p>
        </aside>
      </div>
    </>
  );
}

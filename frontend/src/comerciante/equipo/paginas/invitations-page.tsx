import { useClientPage, ClientPager } from '../../../compartido/componentes/pagination';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Clock3, Mail, RefreshCw } from 'lucide-react';
import { api } from '../../../compartido/api/api';

import { useWorkspace } from '../../../compartido/acceso/workspace';
import { Button, Empty, Notice } from '../../../compartido/componentes/ui';

export function InvitationsPage() {
  const { data, reload } = useWorkspace(),
    navigate = useNavigate(),
    [pending, setPending] = useState(''),
    [error, setError] = useState('');
  const page = useClientPage(data?.invitations ?? []);
  async function accept(id: string) {
    setPending(id);
    setError('');
    try {
      const result = await api<{ negocio_id: string }>(`/me/invitaciones/${id}/aceptar`, {
        method: 'POST',
      });
      await reload();
      navigate(`/negocios/${result.negocio_id}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPending('');
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">CRECEMOS EN EQUIPO</span>
          <h1>Invitaciones para ti</h1>
          <p>Estas invitaciones están vinculadas a {data?.me.email}.</p>
        </div>
        <Button variant="secondary" onClick={() => void reload()}>
          <RefreshCw size={17} /> Actualizar
        </Button>
      </div>
      {error && <Notice>{error}</Notice>}
      <section className="panel">
        <ClientPager page={page} />
        {data?.invitations.length ? (
          <div className="invitation-list">
            {page.items.map((i) => (
              <article className="invitation-card" key={i.id}>
                <span className="icon-tile">
                  <Mail size={25} />
                </span>
                <div>
                  <span className="badge">
                    {i.tipo === 'alta_negocio'
                      ? 'Invitación de propietario'
                      : 'Invitación de acceso'}
                  </span>
                  <h2>{i.negocio_nombre}</h2>
                  <p>Hola, {i.nombre}. Te invitaron a formar parte de este negocio.</p>
                  <small>
                    <Clock3 size={14} /> Disponible hasta el{' '}
                    {new Intl.DateTimeFormat('es-PE', {
                      dateStyle: 'medium',
                      timeZone: 'America/Lima',
                    }).format(new Date(i.vence_en))}
                  </small>
                </div>
                <Button
                  busy={pending === i.id}
                  disabled={!!pending}
                  onClick={() => void accept(i.id)}
                >
                  Aceptar invitación <ArrowRight size={18} />
                </Button>
              </article>
            ))}
          </div>
        ) : (
          <Empty title="Estás al día">
            No tienes invitaciones pendientes. Si esperabas una, verifica que ingresaste con el
            correo que recibió la invitación.
            <Link className="button secondary" to="/negocios">
              Ir a mis negocios <ArrowRight size={17} />
            </Link>
          </Empty>
        )}
      </section>
      <p className="quiet-note">
        Si el enlace de tu correo venció, solicita al remitente una nueva invitación.
      </p>
    </>
  );
}

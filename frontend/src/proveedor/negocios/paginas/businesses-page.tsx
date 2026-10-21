import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Notice } from '../../../compartido/componentes/ui';
import { InvitationList } from '../../invitaciones/componentes/invitation-list';
import { usePlatform } from '../../estado/platform';

import { invitationState } from '../../invitaciones/platform';
import { PlatformStatus } from '../../componentes/platform-status';
import { SearchField } from '../../componentes/search-field';
export function PlatformBusinessesPage() {
  const { invitations, loading, error } = usePlatform(),
    [search, setSearch] = useState('');
  if (loading || error) return <PlatformStatus />;
  const accepted = invitations.filter((i) => invitationState(i) === 'aceptada');
  const visible = accepted.filter((i) =>
    `${i.negocio_nombre} ${i.email} ${i.nombre}`
      .toLocaleLowerCase('es')
      .includes(search.toLocaleLowerCase('es')),
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">TU PLATAFORMA</span>
          <h1>Negocios incorporados</h1>
          <p>Altas completadas mediante una invitación de VEXOR.</p>
        </div>
        <Link className="button primary" to="/plataforma/invitaciones/nueva">
          <Plus size={18} /> Registrar negocio
        </Link>
      </div>
      <section className="panel">
        <div className="panel-heading">
          <h2>
            Altas completadas <span className="count">{accepted.length}</span>
          </h2>
        </div>
        <SearchField value={search} onChange={setSearch} />
        <InvitationList items={visible} completed />
      </section>
      <Notice tone="info">
        Estos registros muestran el alta y el destinatario de la invitación. Administrar VEXOR no
        concede acceso a la operación privada de cada negocio.
      </Notice>
    </>
  );
}

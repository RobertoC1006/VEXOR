import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, RefreshCw } from 'lucide-react';
import { Button } from '../../../compartido/componentes/ui';
import { InvitationList } from '../componentes/invitation-list';
import { usePlatform } from '../../estado/platform';

import { invitationState } from '../platform';
import { PlatformStatus } from '../../componentes/platform-status';
import { SearchField } from '../../componentes/search-field';
export function PlatformInvitationsPage() {
  const { invitations, loading, error, reload } = usePlatform(),
    [params, setParams] = useSearchParams(),
    [search, setSearch] = useState('');
  if (loading || error) return <PlatformStatus />;
  const filter = params.get('estado') ?? 'todas';
  const items = invitations.filter(
    (i) =>
      (filter === 'todas' ||
        (filter === 'correo' && invitationState(i) === 'pendiente' && i.estado_envio === 'error') ||
        invitationState(i) === filter) &&
      `${i.negocio_nombre} ${i.email} ${i.nombre}`
        .toLocaleLowerCase('es')
        .includes(search.toLocaleLowerCase('es')),
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">INCORPORACIÓN DE NEGOCIOS</span>
          <h1>Invitaciones de la plataforma</h1>
          <p>Revisa el envío y la aceptación de cada solicitud de alta.</p>
        </div>
        <Link className="button primary" to="/plataforma/invitaciones/nueva">
          <Plus size={18} /> Registrar negocio
        </Link>
      </div>
      <section className="panel">
        <div className="platform-toolbar">
          <SearchField value={search} onChange={setSearch} />
          <Button variant="secondary" onClick={() => void reload()}>
            <RefreshCw size={16} /> Actualizar
          </Button>
        </div>
        <div className="platform-filters" role="group" aria-label="Filtrar invitaciones">
          {[
            ['todas', 'Todas'],
            ['pendiente', 'Por aceptar'],
            ['aceptada', 'Aceptadas'],
            ['correo', 'Correo por revisar'],
            ['vencida', 'Vencidas'],
            ['revocada', 'Revocadas'],
          ].map(([value, label]) => (
            <button
              type="button"
              key={value}
              aria-pressed={filter === value}
              onClick={() => setParams(value === 'todas' ? {} : { estado: value })}
            >
              {label}
            </button>
          ))}
        </div>
        <InvitationList items={items} manage />
      </section>
      <p className="quiet-note">
        “Aceptado por el proveedor” no confirma que el mensaje llegó a la bandeja de entrada.
      </p>
    </>
  );
}

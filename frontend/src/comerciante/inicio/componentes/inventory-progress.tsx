import { Link } from 'react-router-dom';
import { ClientPager, useClientPage } from '../../../compartido/componentes/pagination';
import { inventoryLink } from '../../inventario/navigation';
import type { LocalSummary } from '../types';
export function InventoryProgress({ locals, base }: { locals: LocalSummary[]; base: string }) {
  const page = useClientPage(locals);
  return (
    <>
      <ClientPager page={page} />
      <div className="inventory-chart" aria-label="Avance del inventario por local">
        {page.items.map((local) => {
          const percent = local.total ? Math.round((local.confirmados / local.total) * 100) : 0;
          return (
            <div key={local.id} className="inventory-bar-row">
              <div>
                <Link to={inventoryLink(base, { localId: local.id })}>{local.nombre}</Link>
                <small>{local.habilitado_venta ? 'Puesto de venta' : 'Almacén'}</small>
              </div>
              <div>
                <div
                  className="inventory-bar-track"
                  role="meter"
                  aria-label={`Conteos confirmados en ${local.nombre}`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={percent}
                  aria-valuetext={`${local.confirmados} de ${local.total} conteos confirmados`}
                >
                  <span style={{ width: `${percent}%` }} />
                </div>
                <small>
                  {local.total
                    ? `${local.confirmados} de ${local.total} confirmados`
                    : 'Sin productos activos por contar'}
                </small>
              </div>
              <strong>{percent}%</strong>
            </div>
          );
        })}
      </div>
      <div className="chart-legend">
        <span>
          <i className="legend-confirmed" />
          Confirmado
        </span>
        <span>
          <i className="legend-pending" />
          Pendiente o borrador
        </span>
      </div>
    </>
  );
}

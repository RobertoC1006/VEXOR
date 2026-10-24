import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CalendarDays,
  Package,
  ClipboardCheck,
  TriangleAlert,
  RefreshCw,
  CheckCircle2,
  Layers,
  Settings,
} from 'lucide-react';
import { api } from '../../../compartido/api/api';
import { useResource } from '../../../compartido/api/use-resource';
import { ResourceState } from '../../../compartido/componentes/feedback';
import { Button, Notice } from '../../../compartido/componentes/ui';
import { useWorkspace } from '../../../compartido/acceso/workspace';
import { useBusiness } from '../../negocio/context';
import { inventoryLink } from '../../inventario/navigation';
import { ProductPhoto } from '../../productos/componentes/product-photo';
import { InventoryProgress } from '../componentes/inventory-progress';
import type { BusinessSummary } from '../types';
const number = new Intl.NumberFormat('es-PE');
export function DashboardPage() {
  const { business, access, base, can } = useBusiness();
  const { data: workspace } = useWorkspace();
  const resource = useResource(`${base}/resumen`, (signal) =>
    api<BusinessSummary>(`${base}/resumen`, { signal }),
  );
  const name = workspace?.me.perfil?.nombre?.trim().split(/\s+/)[0] ?? 'de nuevo';
  const today = new Intl.DateTimeFormat('es-PE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: business.zona_horaria,
  }).format(new Date());
  const summary = resource.data;
  const locals = summary?.locales ?? [];
  const sum = (field: 'total' | 'confirmados' | 'unidades' | 'alertas' | 'sin_minimo') =>
    locals.reduce((total, l) => total + l[field], 0);
  const pending = sum('total') - sum('confirmados');
  const firstPending = locals.find((l) => l.confirmados < l.total)?.id;
  const firstAlert = locals.find((l) => l.alertas > 0)?.id;
  return (
    <>
      <div className="page-heading dashboard-heading">
        <div>
          <span className="eyebrow">RESUMEN DE {business.nombre}</span>
          <h1>¡Hola, {name}!</h1>
          <p>Aquí tienes el estado de tu negocio para continuar con tu día.</p>
        </div>
        <div className="dashboard-heading-actions">
          <time className="date">
            <CalendarDays size={16} />
            {today}
          </time>
          <Button
            variant="secondary"
            disabled={resource.loading}
            onClick={() => void resource.refresh()}
          >
            <RefreshCw size={16} />
            Actualizar
          </Button>
        </div>
      </div>
      {!summary ? (
        <ResourceState error={resource.error} retry={resource.refresh} />
      ) : !summary.catalogo ? (
        <>
          <Notice>
            Tu cuenta no tiene acceso al catálogo ni al resumen de inventario. El propietario puede
            asignarte los permisos necesarios.
          </Notice>
          <Link className="button secondary" to={`${base}/configuracion`}>
            Consultar mi negocio
          </Link>
        </>
      ) : (
        <>
          <div className="dashboard-metrics">
            <Link className="dashboard-metric" to={`${base}/productos`}>
              <div>
                <span>Productos activos</span>
                <Package size={19} />
              </div>
              <strong>{number.format(summary.catalogo.productos)}</strong>
              <small>{number.format(summary.catalogo.combinaciones)} combinaciones activas</small>
              <span className="metric-link">
                Ver catálogo <ArrowRight size={14} />
              </span>
            </Link>
            <Link className="dashboard-metric" to={inventoryLink(base)}>
              <div>
                <span>Unidades confirmadas</span>
                <Layers size={19} />
              </div>
              <strong>{locals.length ? number.format(sum('unidades')) : '—'}</strong>
              <small>
                {locals.length
                  ? 'Solo cantidades confirmadas en tus locales'
                  : 'Sin locales de inventario accesibles'}
              </small>
              <span className="metric-link">
                Ver inventario <ArrowRight size={14} />
              </span>
            </Link>
            <Link
              className="dashboard-metric"
              to={inventoryLink(base, { status: 'pendiente', localId: firstPending })}
            >
              <div>
                <span>Conteos pendientes</span>
                <ClipboardCheck size={19} />
              </div>
              <strong>{locals.length ? number.format(pending) : '—'}</strong>
              <small>Productos y combinaciones, por local</small>
              <span className="metric-link">
                Continuar conteo <ArrowRight size={14} />
              </span>
            </Link>
            <a
              className={`dashboard-metric ${sum('alertas') ? 'metric-alert' : ''}`}
              href="#stock-alertas"
            >
              <div>
                <span>Alertas de stock</span>
                <TriangleAlert size={19} />
              </div>
              <strong>{locals.length ? number.format(sum('alertas')) : '—'}</strong>
              <small>Existencias en el mínimo o por debajo</small>
              <span className="metric-link">
                Revisar alertas <ArrowRight size={14} />
              </span>
            </a>
          </div>
          <div className="dashboard-main-grid">
            <section className="panel dashboard-panel">
              <div className="dashboard-panel-heading">
                <div>
                  <h2>Preparación del inventario</h2>
                  <p>Avance de los conteos por puesto o almacén.</p>
                </div>
                <span className="dashboard-total">
                  {sum('confirmados')}
                  <small>de {sum('total')} conteos</small>
                </span>
              </div>
              {locals.length ? (
                <InventoryProgress locals={locals} base={base} />
              ) : (
                <div className="dashboard-empty">
                  <ClipboardCheck size={32} />
                  <h3>Prepara tu primer conteo</h3>
                  <p>Configura un local y sus permisos para consultar el avance.</p>
                  <Link className="button secondary" to={`${base}/locales`}>
                    Ver puestos y almacenes
                  </Link>
                </div>
              )}
              <p className="dashboard-footnote">Un conteo pendiente no equivale a stock cero.</p>
            </section>
            <section className="panel dashboard-panel">
              <div className="dashboard-panel-heading">
                <div>
                  <h2>Cambios recientes</h2>
                  <p>Última actualización de fichas y conteos confirmados.</p>
                </div>
              </div>
              <div className="dashboard-activity">
                {summary.actividad.length ? (
                  summary.actividad.map((item, index) => (
                    <Link
                      key={`${item.tipo}:${item.id}:${item.local_id ?? ''}:${index}`}
                      to={
                        item.tipo === 'conteo'
                          ? inventoryLink(base, {
                              productId: item.id,
                              localId: item.local_id ?? undefined,
                            })
                          : `${base}/productos`
                      }
                    >
                      <span className={`activity-icon ${item.tipo}`}>
                        {item.tipo === 'conteo' ? (
                          <CheckCircle2 size={18} />
                        ) : (
                          <Package size={18} />
                        )}
                      </span>
                      <span>
                        <strong>
                          {item.tipo === 'conteo' ? 'Conteo confirmado' : 'Ficha actualizada'}
                        </strong>
                        <small>
                          {item.nombre}
                          {item.local_nombre ? ` · ${item.local_nombre}` : ''}
                        </small>
                        <time>
                          {new Intl.DateTimeFormat('es-PE', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                            timeZone: business.zona_horaria,
                          }).format(new Date(item.fecha))}
                        </time>
                      </span>
                    </Link>
                  ))
                ) : (
                  <p className="empty-inline">
                    Los productos y conteos que registres aparecerán aquí.
                  </p>
                )}
              </div>
            </section>
          </div>
          <div className="dashboard-lower-grid">
            <section id="stock-alertas" className="panel dashboard-panel">
              <div className="dashboard-panel-heading">
                <div>
                  <h2>Stock que necesita atención</h2>
                  <p>Revisa la combinación y el local antes de reponer.</p>
                </div>
                <span className="count">{sum('alertas')}</span>
              </div>
              {summary.alertas.length ? (
                <>
                  <div className="dashboard-alert-list">
                    {summary.alertas.map((item) => (
                      <Link
                        key={`${item.id}:${item.local_id}`}
                        to={inventoryLink(base, { productId: item.id, localId: item.local_id })}
                      >
                        <ProductPhoto
                          id={item.id}
                          version={item.foto_version}
                          name={item.modelo_nombre ?? item.nombre}
                        />
                        <span>
                          <strong>
                            {item.modelo_nombre
                              ? `${item.modelo_nombre} · ${item.nombre}`
                              : item.nombre}
                          </strong>
                          <small>{item.local_nombre}</small>
                        </span>
                        <span className="alert-quantity">
                          <strong>{item.cantidad} unid.</strong>
                          <small>Mínimo: {item.minimo}</small>
                        </span>
                        <ArrowRight size={17} />
                      </Link>
                    ))}
                  </div>
                  <Link
                    className="dashboard-text-link"
                    to={inventoryLink(base, { status: 'bajo', localId: firstAlert })}
                  >
                    Consultar alertas por local <ArrowRight size={15} />
                  </Link>
                </>
              ) : (
                <div className="dashboard-empty compact">
                  <CheckCircle2 size={28} />
                  <p>
                    {locals.length
                      ? 'No hay alertas entre las existencias confirmadas con mínimo configurado.'
                      : 'No hay información de inventario accesible.'}
                  </p>
                </div>
              )}
              {sum('sin_minimo') > 0 && (
                <p className="dashboard-footnote">
                  {sum('sin_minimo')} conteos confirmados aún no tienen mínimo configurado.
                </p>
              )}
            </section>
            <section className="panel dashboard-panel dashboard-next">
              <Settings size={24} />
              <h2>Continúa con tu negocio</h2>
              <p>{business.rubro ?? 'Completa el rubro y tu plantilla de productos.'}</p>
              <div className="dashboard-shortcuts">
                <Link to={`${base}/productos`}>
                  Catálogo de productos <ArrowRight size={16} />
                </Link>
                <Link to={inventoryLink(base, { status: 'pendiente', localId: firstPending })}>
                  Contar mi mercadería <ArrowRight size={16} />
                </Link>
                <Link to={`${base}/configuracion`}>
                  Revisar configuración <ArrowRight size={16} />
                </Link>
                {can('equipo.ver') && (
                  <Link to={`${base}/equipo`}>
                    Mi equipo <ArrowRight size={16} />
                  </Link>
                )}
              </div>
              <small>
                {access.es_propietario ? 'Propietario del negocio' : 'Acceso según tus permisos'} ·
                Las ventas registradas están disponibles en el punto de venta.
              </small>
            </section>
          </div>
        </>
      )}
    </>
  );
}

import { Link } from 'react-router-dom';
import { listAll } from '../../../compartido/api/api';
import { useResource } from '../../../compartido/api/use-resource';
import { Button, Empty } from '../../../compartido/componentes/ui';
import { ResourceState } from '../../../compartido/componentes/feedback';
import { useBusiness } from '../../negocio/context';
import { priceLabel, type Product } from '../types';

export function VariantsPanel({
  parent,
  onClose,
  onEdit,
}: {
  parent: Product;
  onClose: () => void;
  onEdit: () => void;
}) {
  const { base, can } = useBusiness();
  const resource = useResource(`${base}/productos/${parent.id}/variantes`, (signal) =>
    listAll<Product>(`${base}/productos/${parent.id}/variantes`, signal),
  );
  return (
    <section className="panel settings-panel" aria-label={`Combinaciones de ${parent.nombre}`}>
      <div className="panel-heading compact">
        <h2>Combinaciones de {parent.nombre}</h2>
        <Button variant="ghost" onClick={onClose}>
          Cerrar combinaciones
        </Button>
      </div>
      <p className="field-hint">
        Cada combinación indica qué talla, copa, color u otras características vas a contar por
        separado. Una combinación puede tener muchas unidades. La categoría solo agrupa productos.
      </p>
      {can('productos.gestionar') && <Button onClick={onEdit}>Editar combinaciones</Button>}
      {!resource.data ? (
        <ResourceState error={resource.error} retry={resource.refresh} />
      ) : (
        <>
          {resource.data.map((v) => (
            <article key={v.id} className="settings-row">
              <div className="settings-row-main">
                <h3>
                  {v.nombre}
                  {!v.activo ? ' · Pausada' : ''}
                </h3>
                <p>{v.caracteristicas.map((a) => `${a.nombre}: ${a.valor}`).join(' · ')}</p>
                <p>
                  {v.codigo ? `Código: ${v.codigo} · ` : ''}
                  {priceLabel(v.precio)}
                </p>
              </div>
            </article>
          ))}
          {!resource.data.length && (
            <Empty title="Añade la primera combinación">
              Las cantidades de cada talla y color se registran después en Inventario.
            </Empty>
          )}
          <Link className="button secondary" to={`${base}/inventario`}>
            Ir a contar el inventario
          </Link>
        </>
      )}
    </section>
  );
}

import { inventoryLink } from '../../inventario/navigation';
import { Pagination } from '../../../compartido/componentes/pagination';
import { useCatalogPage } from '../use-catalog-page';
import { Link } from 'react-router-dom';
import { Button, Empty } from '../../../compartido/componentes/ui';
import { ResourceState } from '../../../compartido/componentes/feedback';
import { useBusiness } from '../../negocio/context';
import { priceLabel, type Product } from '../types';

export function VariantsContent({
  parent,
  onEdit,
  localId,
}: {
  parent: Product;
  onEdit: () => void;
  localId?: string;
}) {
  const { base, can } = useBusiness();
  const resource = useCatalogPage<Product>(`${base}/productos/${parent.id}/variantes`);
  return (
    <>
      <section className="panel settings-panel" aria-label={`Combinaciones de ${parent.nombre}`}>
        <p className="field-hint">
          Cada combinación indica qué talla, copa, color u otras características vas a contar por
          separado. Una combinación puede tener muchas unidades. La categoría solo agrupa productos.
        </p>
        {can('productos.gestionar') && <Button onClick={onEdit}>Editar combinaciones</Button>}
        {!resource.data ? (
          <ResourceState error={resource.error} retry={resource.refresh} />
        ) : (
          <>
            <Pagination
              total={
                resource.data?.has_more
                  ? undefined
                  : resource.offset + (resource.data?.items.length ?? 0)
              }
              pageSize={resource.pageSize}
              offset={resource.offset}
              loading={resource.loading}
              more={resource.data.has_more ?? false}
              onChange={resource.setOffset}
              onPageSize={resource.setPageSize}
            />
            {resource.data.items.map((v) => (
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
                <Link
                  className="button secondary"
                  to={inventoryLink(base, { productId: v.id, localId, count: true })}
                >
                  Contar esta combinación<span className="visually-hidden"> {v.nombre}</span>
                </Link>
              </article>
            ))}
            {!resource.data.items.length && (
              <Empty title="Añade la primera combinación">
                Las cantidades de cada talla y color se registran después en Inventario.
              </Empty>
            )}
            <Link
              className="button secondary"
              to={inventoryLink(base, { productId: parent.id, localId, count: true })}
            >
              Ir a contar el inventario
            </Link>
          </>
        )}
      </section>
    </>
  );
}

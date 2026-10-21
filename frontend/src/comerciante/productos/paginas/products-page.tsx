import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useBusiness } from '../../negocio/context';
import { Button, Empty, Notice } from '../../../compartido/componentes/ui';
import { PageHeading, ResourceState } from '../../../compartido/componentes/feedback';
import { ProductForm } from '../componentes/product-form';
import { VariantsPanel } from '../componentes/variants-panel';
import { CatalogPager, CatalogSearch } from '../componentes/catalog-controls';
import { useCatalogPage } from '../use-catalog-page';
import { priceLabel, type Product } from '../types';

export function ProductsPage() {
  const { can } = useBusiness();
  if (!can('productos.ver') && !can('productos.gestionar'))
    return <Notice>No tienes permiso para consultar productos.</Notice>;
  return <ProductCatalog />;
}
function ProductCatalog() {
  const { base, can } = useBusiness();
  const resource = useCatalogPage<Product>(`${base}/productos`);
  const [editor, setEditor] = useState<Product | 'new' | 'example' | null>(null);
  const [variants, setVariants] = useState<Product | null>(null);
  return (
    <>
      <PageHeading
        eyebrow="MERCADERÍA DEL NEGOCIO"
        title="Productos"
        description="Registra lo que vendes y completa sus datos a tu ritmo."
        action={
          can('productos.gestionar') && (
            <Button
              onClick={() => {
                setVariants(null);
                setEditor('new');
              }}
            >
              <Plus size={17} />
              Nuevo producto
            </Button>
          )
        }
      />
      {can('productos.gestionar') && !editor && (
        <p className="catalog-example">
          <Button
            variant="ghost"
            onClick={() => {
              setVariants(null);
              setEditor('example');
            }}
          >
            Preparar ejemplo de lencería
          </Button>
          <span>Abre una ficha avanzada con datos de prueba; tú decides cuándo guardarla.</span>
        </p>
      )}
      {editor && (
        <ProductForm
          key={typeof editor === 'string' ? editor : editor.id}
          product={typeof editor === 'string' ? undefined : editor}
          example={editor === 'example'}
          onCancel={() => setEditor(null)}
          onSaved={async () => {
            setEditor(null);
            await resource.refresh();
          }}
        />
      )}
      {variants && (
        <VariantsPanel key={variants.id} parent={variants} onClose={() => setVariants(null)} />
      )}
      <CatalogSearch
        value={resource.search}
        onChange={resource.setSearch}
        onSearch={resource.find}
      />
      {!resource.data ? (
        <ResourceState error={resource.error} retry={resource.refresh} />
      ) : (
        <section className="panel">
          <div className="settings-list">
            {resource.data.items.map((product) => (
              <article key={product.id} className="settings-row">
                <div className="settings-row-main">
                  <h2 className="catalog-title">{product.nombre}</h2>
                  <p>
                    {product.codigo ? `Código: ${product.codigo}` : 'Sin código'}
                    {product.alias ? ` · ${product.alias}` : ''}
                  </p>
                  {product.descripcion && <p>{product.descripcion}</p>}
                  <p>
                    {product.nivel_registro === 'avanzado'
                      ? 'Avanzado · inventario por variante'
                      : product.nivel_registro === 'intermedio'
                        ? 'Intermedio · características descriptivas'
                        : 'Simple · cantidad total'}
                  </p>
                  {!!product.caracteristicas?.length && (
                    <p>
                      {product.caracteristicas.map((a) => `${a.nombre}: ${a.valor}`).join(' · ')}
                    </p>
                  )}
                  <p>
                    {priceLabel(product.precio)} ·{' '}
                    {product.costo === null
                      ? 'Costo pendiente'
                      : `Costo: ${priceLabel(product.costo)}`}
                  </p>
                </div>
                {!product.activo && <span className="badge neutral">Pausado</span>}
                {product.nivel_registro === 'avanzado' && (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setEditor(null);
                      setVariants(product);
                    }}
                  >
                    Variantes<span className="visually-hidden"> {product.nombre}</span>
                  </Button>
                )}
                {can('productos.gestionar') && (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setVariants(null);
                      setEditor(product);
                    }}
                  >
                    Editar<span className="visually-hidden"> {product.nombre}</span>
                  </Button>
                )}
              </article>
            ))}
          </div>
          {!resource.data.items.length && (
            <Empty title="Todavía no hay productos en esta lista">
              Crea una ficha o prueba otra búsqueda. El conteo se prepara en Inventario.
            </Empty>
          )}
          <CatalogPager
            offset={resource.offset}
            more={resource.data.has_more ?? false}
            loading={resource.loading}
            onChange={resource.setOffset}
          />
        </section>
      )}
    </>
  );
}

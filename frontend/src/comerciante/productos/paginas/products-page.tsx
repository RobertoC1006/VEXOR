import { Pagination } from '../../../compartido/componentes/pagination';
import { Modal } from '../../../compartido/componentes/modal';
import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useBusiness } from '../../negocio/context';
import { Button, Empty, Notice } from '../../../compartido/componentes/ui';
import { PageHeading, ResourceState } from '../../../compartido/componentes/feedback';
import { ProductForm } from '../componentes/product-form';
import { VariantsPanel } from '../componentes/variants-panel';
import { CatalogSearch } from '../componentes/catalog-controls';
import { useCatalogPage } from '../use-catalog-page';
import { priceLabel, type Product } from '../types';
import {
  CategoriesProvider,
  CategoriesManager,
  CategorySelect,
  categoryPath,
  useCategories,
} from '../../categorias/categories';

export function ProductsPage() {
  const { can } = useBusiness();
  if (!can('productos.ver') && !can('productos.gestionar'))
    return <Notice>No tienes permiso para consultar productos.</Notice>;
  return (
    <CategoriesProvider>
      <ProductCatalog />
    </CategoriesProvider>
  );
}
function ProductCatalog() {
  const { base, can } = useBusiness();
  const categories = useCategories();
  const [category, setCategory] = useState('');
  const resource = useCatalogPage<Product>(`${base}/productos`, category);
  const [editor, setEditor] = useState<Product | 'new' | 'example' | null>(null);
  const [variants, setVariants] = useState<Product | null>(null);
  return (
    <>
      <PageHeading
        eyebrow="MERCADERÍA DEL NEGOCIO"
        title="Productos"
        description="Busca un producto, revisa sus combinaciones o crea uno nuevo."
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
      {can('productos.gestionar') && (
        <div className="catalog-tools">
          <Button variant="secondary" onClick={() => categories.setOpen(true)}>
            Categorías
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setVariants(null);
              setEditor('example');
            }}
          >
            Preparar ejemplo de lencería
          </Button>
        </div>
      )}
      <CategoriesManager />
      {editor && (
        <Modal
          label={typeof editor === 'string' ? 'Nuevo producto' : `Editar ${editor.nombre}`}
          onClose={() => setEditor(null)}
        >
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
        </Modal>
      )}
      {variants && (
        <VariantsPanel
          key={variants.id}
          parent={variants}
          onClose={() => setVariants(null)}
          onEdit={() => {
            setEditor(variants);
            setVariants(null);
          }}
        />
      )}
      <div className="catalog-filters">
        <CatalogSearch
          value={resource.search}
          onChange={resource.setSearch}
          onSearch={resource.find}
          onScan={resource.findCode}
        />
        <div className="catalog-category-filter">
          <CategorySelect
            label="Filtrar por categoría"
            empty="Todas las categorías"
            value={category}
            onChange={setCategory}
          />
        </div>
      </div>
      {categories.error && (
        <Notice>
          No pudimos cargar las categorías. Puedes seguir buscando productos o actualizar la página.
        </Notice>
      )}
      {!resource.data ? (
        <ResourceState error={resource.error} retry={resource.refresh} />
      ) : (
        <section className="panel">
          <Pagination
            total={
              resource.data?.has_more
                ? undefined
                : resource.offset + (resource.data?.items.length ?? 0)
            }
            pageSize={resource.pageSize}
            onPageSize={resource.setPageSize}
            offset={resource.offset}
            more={resource.data.has_more ?? false}
            loading={resource.loading}
            onChange={resource.setOffset}
          />
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
                  {product.categoria_id && (
                    <p>
                      Categoría:{' '}
                      {categoryPath(categories.categories, product.categoria_id) ||
                        'Categoría asignada'}
                    </p>
                  )}
                  <p>
                    {product.nivel_registro === 'avanzado'
                      ? 'Modelo · cantidades por combinación'
                      : product.nivel_registro === 'intermedio'
                        ? 'Intermedio · características descriptivas'
                        : 'Simple · cantidad total'}
                  </p>
                  {!!product.caracteristicas?.length && (
                    <p>
                      {product.caracteristicas.map((a) => `${a.nombre}: ${a.valor}`).join(' · ')}
                    </p>
                  )}
                  {product.nivel_registro !== 'avanzado' && (
                    <p>
                      {priceLabel(product.precio)} ·{' '}
                      {product.costo === null
                        ? 'Costo pendiente'
                        : `Costo: ${priceLabel(product.costo)}`}
                    </p>
                  )}
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
                    Ver combinaciones<span className="visually-hidden"> {product.nombre}</span>
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
                    {product.nivel_registro === 'avanzado' ? 'Editar modelo' : 'Editar'}
                    <span className="visually-hidden"> {product.nombre}</span>
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
        </section>
      )}
    </>
  );
}

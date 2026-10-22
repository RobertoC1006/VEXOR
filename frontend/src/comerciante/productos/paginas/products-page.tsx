import { ChoicePicker } from '../../../compartido/componentes/choice-picker';
import { categoryOptions } from '../../categorias/category-picker';
import { StockGauge } from '../../inventario/componentes/stock-gauge';
import { ProductDetail } from '../componentes/product-detail';
import { MerchandiseTable } from '../componentes/merchandise-table';
import { listAll } from '../../../compartido/api/api';
import { useResource } from '../../../compartido/api/use-resource';
import type { BusinessLocal } from '../../locales/types';
import { Pagination } from '../../../compartido/componentes/pagination';
import { Modal } from '../../../compartido/componentes/modal';
import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useBusiness } from '../../negocio/context';
import { Button, Empty, Notice } from '../../../compartido/componentes/ui';
import { PageHeading, ResourceState } from '../../../compartido/componentes/feedback';
import { ProductForm } from '../componentes/product-form';
import { CatalogSearch } from '../componentes/catalog-controls';
import { useCatalogPage } from '../use-catalog-page';
import { catalogPrice, type Product } from '../types';
import {
  CategoriesProvider,
  CategoriesManager,
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
  const canStock = can('inventario.ver') || can('inventario.contar') || can('inventario.confirmar');
  const locations = useResource(`${base}/catalogo-locales`, (signal) =>
    canStock ? listAll<BusinessLocal>(`${base}/locales`, signal) : Promise.resolve([]),
  );
  const [selectedLocal, setSelectedLocal] = useState<string | null>(null);
  const locals = (locations.data ?? []).filter((l) => l.activo);
  const localId = selectedLocal ?? locals[0]?.id;
  const resource = useCatalogPage<Product>(`${base}/productos`, category, localId || undefined);
  const [editor, setEditor] = useState<Product | 'new' | 'example' | null>(null);
  const [detail, setDetail] = useState<Product | null>(null);
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
                setDetail(null);
                setEditor('new');
              }}
            >
              <Plus size={17} />
              Nuevo producto
            </Button>
          )
        }
      />
      <div className="catalog-tools">
        {can('productos.gestionar') && (
          <>
            <Button variant="secondary" onClick={() => categories.setOpen(true)}>
              Categorías
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setDetail(null);
                setEditor('example');
              }}
            >
              Preparar ejemplo de lencería
            </Button>
          </>
        )}
        {canStock && locals.length > 0 && (
          <div className="catalog-stock-scope">
            <ChoicePicker
              label="Stock en"
              value={localId ?? ''}
              onChange={setSelectedLocal}
              options={[
                { id: '', title: 'Sin stock por local', description: 'Consultar solo el catálogo' },
                ...locals.map((l) => ({
                  id: l.id,
                  title: l.nombre,
                  description: l.habilitado_venta ? 'Puesto de venta' : 'Almacén',
                })),
              ]}
            />
          </div>
        )}
      </div>
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
      {detail && (
        <ProductDetail
          product={detail}
          localId={localId || undefined}
          localName={locals.find((l) => l.id === localId)?.nombre}
          onClose={() => setDetail(null)}
          onEdit={() => {
            setEditor(detail);
            setDetail(null);
          }}
        />
      )}
      {categories.categories.length > 0 && (
        <div className="category-tabs" role="group" aria-label="Categorías del catálogo">
          <button type="button" aria-pressed={!category} onClick={() => setCategory('')}>
            Todas
          </button>
          {categories.categories
            .filter(
              (c) =>
                !categories.categories.some((child) => child.padre_id === c.id) ||
                c.id === category,
            )
            .slice(0, 5)
            .map((c) => (
              <button
                type="button"
                key={c.id}
                aria-pressed={category === c.id}
                onClick={() => setCategory(c.id)}
              >
                {c.nombre}
              </button>
            ))}
        </div>
      )}
      <div className="catalog-filters">
        <CatalogSearch
          value={resource.search}
          onChange={resource.setSearch}
          onSearch={resource.find}
          onScan={resource.findCode}
        />
        <div className="catalog-category-filter">
          <ChoicePicker
            label="Filtrar por categoría"
            value={category}
            onChange={setCategory}
            options={[
              { id: '', title: 'Todas las categorías', description: 'Ver todo el catálogo' },
              ...categoryOptions(categories.categories),
            ]}
          />
        </div>
      </div>
      {locations.error && (
        <p className="field-hint">
          No pudimos cargar los locales. El catálogo sigue disponible; el stock se consulta por
          local.
        </p>
      )}
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
          <MerchandiseTable
            rows={resource.data.items.map((product) => ({
              id: product.id,
              onOpen: () => setDetail(product),
              stockVisual: (
                <StockGauge
                  lowCount={product.nivel_registro === 'avanzado' ? product.stock?.bajos : 0}
                  quantity={product.stock?.cantidad ?? null}
                  minimum={product.stock?.minimo ?? null}
                  hint={
                    product.stock?.cantidad === null && product.stock.confirmados
                      ? `Parcial: ${product.stock.confirmados}/${product.stock.total}`
                      : undefined
                  }
                />
              ),
              name: product.nombre,
              code: product.codigo,
              photoVersion: product.foto_version,
              model:
                product.caracteristicas.find((a) => a.nombre.toLocaleLowerCase() === 'modelo')
                  ?.valor ??
                (product.nivel_registro === 'avanzado'
                  ? `${product.combinaciones_total ?? 0} combinaciones`
                  : 'Unidad'),
              details:
                product.caracteristicas
                  .filter((a) => a.nombre.toLocaleLowerCase() !== 'modelo')
                  .map((a) => `${a.nombre}: ${a.valor}`)
                  .join(' · ') ||
                (product.categoria_id
                  ? categoryPath(categories.categories, product.categoria_id)
                  : 'Sin categoría'),
              price: catalogPrice(product),
              stock: product.stock?.cantidad == null ? '—' : String(product.stock.cantidad),
              stockHint: !localId
                ? canStock
                  ? 'Elige un local'
                  : 'Sin acceso a inventario'
                : !product.stock
                  ? 'Sin información'
                  : product.stock.cantidad !== null
                    ? 'Contado'
                    : product.stock.total === 0
                      ? 'Sin combinaciones'
                      : product.stock.confirmados > 0
                        ? `Parcial: ${product.stock.confirmados}/${product.stock.total}`
                        : 'Pendiente de contar',
              active: product.activo,
              actions: (
                <Button variant="ghost" onClick={() => setDetail(product)}>
                  Ver detalle<span className="visually-hidden"> {product.nombre}</span>
                </Button>
              ),
            }))}
          />
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

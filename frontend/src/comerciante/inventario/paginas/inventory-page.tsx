import { MinimumForm } from '../componentes/minimum-form';
import { StockGauge } from '../componentes/stock-gauge';
import { MerchandiseTable } from '../../productos/componentes/merchandise-table';
import { priceLabel } from '../../productos/types';
import { Pagination } from '../../../compartido/componentes/pagination';
import { Modal } from '../../../compartido/componentes/modal';
import { useState } from 'react';
import { listAll } from '../../../compartido/api/api';
import { useResource } from '../../../compartido/api/use-resource';
import { Button, Empty, Notice } from '../../../compartido/componentes/ui';
import { LocalTabs } from '../../locales/componentes/local-tabs';
import { PageHeading, ResourceState } from '../../../compartido/componentes/feedback';
import { useBusiness } from '../../negocio/context';
import type { BusinessLocal } from '../../locales/types';
import { CatalogSearch } from '../../productos/componentes/catalog-controls';
import { useCatalogPage } from '../../productos/use-catalog-page';
import { CountForm } from '../componentes/count-form';
import type { InventoryItem, InventoryPermissions } from '../types';

export function InventoryPage() {
  const { base, can } = useBusiness();
  if (!can('productos.ver') && !can('productos.gestionar'))
    return <Notice>Necesitas permiso para consultar productos y acceder al inventario.</Notice>;
  return <InventoryLocals key={base} />;
}
function InventoryLocals() {
  const { base, access } = useBusiness();
  const resource = useResource(`${base}/inventario-locales`, (signal) =>
    listAll<BusinessLocal>(`${base}/locales`, signal),
  );
  const [selected, setSelected] = useState('');
  if (!resource.data) return <ResourceState error={resource.error} retry={resource.refresh} />;
  const locals = resource.data.filter((l) => l.activo);
  const localId = selected || locals[0]?.id;
  return (
    <>
      <PageHeading
        eyebrow="INCORPORA TU MERCADERÍA"
        title="Inventario inicial"
        description="Cuenta producto por producto, sin esperar a terminar todo el local."
      />
      <Notice tone="info">
        Los productos pendientes de conteo se venden fuera de VEXOR. Crear la ficha o guardar un
        borrador no confirma existencias.
      </Notice>
      {locals.length ? (
        <>
          <LocalTabs locals={locals} value={localId} onChange={setSelected} />
          <LocalInventory key={localId} localId={localId} />
        </>
      ) : (
        <Empty title="No hay locales disponibles">
          {access.es_propietario
            ? 'Crea un puesto o almacén para empezar a contar.'
            : 'Consulta con el propietario para que te asigne un local y permisos de inventario.'}
        </Empty>
      )}
    </>
  );
}
function LocalInventory({ localId }: { localId: string }) {
  const { base } = useBusiness();
  const resource = useCatalogPage<InventoryItem, { permisos: InventoryPermissions }>(
    `${base}/locales/${localId}/inventario`,
  );
  const data = resource.data;
  const [minimum, setMinimum] = useState<InventoryItem | null>(null);
  const [editor, setEditor] = useState<InventoryItem | null>(null);
  return (
    <>
      {minimum && (
        <Modal
          label={`Stock mínimo de ${minimum.nombre_completo ?? minimum.nombre}`}
          onClose={() => setMinimum(null)}
        >
          <MinimumForm
            id={minimum.id}
            localId={localId}
            minimum={minimum.minimo ?? null}
            version={minimum.minimo_version ?? 0}
            onSaved={async () => {
              setMinimum(null);
              await resource.refresh();
            }}
          />
        </Modal>
      )}
      <CatalogSearch
        value={resource.search}
        onChange={resource.setSearch}
        onSearch={resource.find}
        onScan={resource.findCode}
      />
      {editor && data && (
        <Modal label={`Conteo de ${editor.nombre}`} onClose={() => setEditor(null)}>
          <CountForm
            key={`${editor.id}:${editor.version}`}
            item={editor}
            localId={localId}
            permissions={data.permisos}
            onCancel={() => setEditor(null)}
            onSaved={async () => {
              setEditor(null);
              await resource.refresh();
            }}
          />
        </Modal>
      )}
      {!data ? (
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
            more={data.has_more ?? false}
            loading={resource.loading}
            onChange={resource.setOffset}
          />
          <MerchandiseTable
            rows={data.items.map((item) => ({
              id: item.id,
              name: item.modelo_nombre ?? item.nombre,
              code: item.codigo,
              photoVersion: item.foto_version,
              model: item.producto_padre_id ? item.nombre : 'Unidad',
              details:
                (item.caracteristicas ?? []).map((a) => `${a.nombre}: ${a.valor}`).join(' · ') ||
                item.referencia ||
                'Sin detalles adicionales',
              price: priceLabel(item.precio ?? null),
              stockVisual: (
                <StockGauge
                  quantity={item.estado === 'confirmado' ? item.cantidad : null}
                  minimum={item.minimo ?? null}
                  hint={
                    item.estado === 'preparacion'
                      ? `Borrador: ${item.cantidad} unidades`
                      : undefined
                  }
                />
              ),
              stock: item.cantidad === null ? '—' : String(item.cantidad),
              stockHint:
                item.estado === 'confirmado'
                  ? 'Confirmado'
                  : item.estado === 'preparacion'
                    ? 'Borrador de conteo'
                    : 'Pendiente de contar',
              active: item.activo,
              actions: (
                <>
                  {data.permisos.confirmar && (
                    <Button variant="ghost" onClick={() => setMinimum(item)}>
                      Configurar mínimo<span className="visually-hidden"> {item.nombre}</span>
                    </Button>
                  )}
                  {item.estado !== 'confirmado' &&
                  (data.permisos.contar ||
                    (item.estado === 'preparacion' && data.permisos.confirmar)) ? (
                    <Button
                      variant="secondary"
                      onClick={() =>
                        setEditor({ ...item, nombre: item.nombre_completo ?? item.nombre })
                      }
                    >
                      {item.estado === 'pendiente' ? 'Contar' : 'Revisar'}
                      <span className="visually-hidden"> {item.nombre}</span>
                    </Button>
                  ) : null}
                </>
              ),
            }))}
          />
          {!data.items.length && (
            <Empty title="No hay productos en esta lista">
              Registra tu mercadería en Productos o prueba otra búsqueda.
            </Empty>
          )}
        </section>
      )}
    </>
  );
}

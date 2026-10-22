import { Pagination } from '../../../compartido/componentes/pagination';
import { Modal } from '../../../compartido/componentes/modal';
import { useState } from 'react';
import { listAll } from '../../../compartido/api/api';
import { useResource } from '../../../compartido/api/use-resource';
import { Button, Empty, Notice } from '../../../compartido/componentes/ui';
import { SelectField } from '../../../compartido/componentes/form-controls';
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
          <SelectField
            label="Puesto o almacén"
            value={localId}
            onChange={(e) => setSelected(e.target.value)}
          >
            {locals.map((l) => (
              <option key={l.id} value={l.id}>
                {l.nombre}
                {l.habilitado_venta ? '' : ' · Almacén'}
              </option>
            ))}
          </SelectField>
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
  const [editor, setEditor] = useState<InventoryItem | null>(null);
  return (
    <>
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
          <div className="settings-list">
            {data.items.map((item) => (
              <article className="settings-row" key={item.id}>
                <div className="settings-row-main">
                  <h2 className="catalog-title">
                    {item.nombre_completo ?? item.nombre}
                    {!item.activo ? ' · Pausado' : ''}
                  </h2>
                  <p>
                    {item.codigo ? `Código: ${item.codigo}` : 'Sin código'}
                    {item.referencia ? ` · ${item.referencia}` : ''}
                  </p>
                  <p>
                    {item.estado === 'confirmado'
                      ? 'Existencia inicial confirmada'
                      : item.estado === 'preparacion'
                        ? 'Borrador de conteo'
                        : 'Existencia desconocida'}
                  </p>
                </div>
                <div className="inventory-quantity">
                  <strong>{item.cantidad === null ? '—' : item.cantidad}</strong>
                  <span>
                    {item.estado === 'confirmado'
                      ? 'Confirmado'
                      : item.estado === 'preparacion'
                        ? 'En preparación'
                        : 'Pendiente de contar'}
                  </span>
                </div>
                {item.estado !== 'confirmado' &&
                  (data.permisos.contar ||
                    (item.estado === 'preparacion' && data.permisos.confirmar)) && (
                    <Button
                      variant="secondary"
                      onClick={() =>
                        setEditor({ ...item, nombre: item.nombre_completo ?? item.nombre })
                      }
                    >
                      {item.estado === 'pendiente' ? 'Contar' : 'Revisar'}
                      <span className="visually-hidden"> {item.nombre}</span>
                    </Button>
                  )}
              </article>
            ))}
          </div>
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

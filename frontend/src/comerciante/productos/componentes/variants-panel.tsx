import { useState } from 'react';
import { Link } from 'react-router-dom';
import { listAll } from '../../../compartido/api/api';
import { useResource } from '../../../compartido/api/use-resource';
import { Button, Empty } from '../../../compartido/componentes/ui';
import { ResourceState } from '../../../compartido/componentes/feedback';
import { useBusiness } from '../../negocio/context';
import { ProductForm } from './product-form';
import { priceLabel, type Product } from '../types';

export function VariantsPanel({ parent, onClose }: { parent: Product; onClose: () => void }) {
  const { base, can } = useBusiness();
  const resource = useResource(`${base}/productos/${parent.id}/variantes`, (signal) =>
    listAll<Product>(`${base}/productos/${parent.id}/variantes`, signal),
  );
  const [editor, setEditor] = useState<Product | 'new' | null>(null);
  return (
    <section className="panel settings-panel" aria-label={`Variantes de ${parent.nombre}`}>
      <div className="panel-heading compact">
        <h2>Variantes de {parent.nombre}</h2>
        <Button variant="ghost" onClick={onClose}>
          Cerrar variantes
        </Button>
      </div>
      <p className="field-hint">
        Registra una combinación por variante: por ejemplo talla 34, copa B y color negro. Cada
        variante tendrá su propio código opcional y su conteo por local.
      </p>
      {can('productos.gestionar') && !editor && (
        <Button onClick={() => setEditor('new')}>Nueva variante</Button>
      )}
      {editor && (
        <ProductForm
          key={editor === 'new' ? 'new' : editor.id}
          parent={parent}
          product={editor === 'new' ? undefined : editor}
          onCancel={() => setEditor(null)}
          onSaved={async () => {
            setEditor(null);
            await resource.refresh();
          }}
        />
      )}
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
              {can('productos.gestionar') && (
                <Button variant="secondary" onClick={() => setEditor(v)}>
                  Editar<span className="visually-hidden"> {v.nombre}</span>
                </Button>
              )}
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

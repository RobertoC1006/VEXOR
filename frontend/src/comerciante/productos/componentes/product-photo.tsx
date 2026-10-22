import { useState } from 'react';
import { PhotoPicker } from '../../../compartido/componentes/photo-picker';
import { Package } from 'lucide-react';
import { api } from '../../../compartido/api/api';
import { useResource } from '../../../compartido/api/use-resource';
import { useBusiness } from '../../negocio/context';

function EmptyPhoto({ name }: { name: string }) {
  return (
    <span className="product-photo empty" role="img" aria-label={`Sin foto de ${name}`}>
      <Package size={25} />
    </span>
  );
}
export function ProductPhoto({
  id,
  version,
  name,
}: {
  id: string;
  version?: number;
  name: string;
}) {
  return version ? (
    <SavedPhoto key={`${id}:${version}`} id={id} version={version} name={name} />
  ) : (
    <EmptyPhoto name={name} />
  );
}
function SavedPhoto({ id, version, name }: { id: string; version: number; name: string }) {
  const { base } = useBusiness();
  const url = `${base}/productos/${id}/foto`;
  const resource = useResource(`${url}:${version}`, (signal) =>
    api<{ imagen: string | null }>(url, { signal }),
  );
  const [failed, setFailed] = useState(false);
  return resource.data?.imagen && !failed ? (
    <img
      className="product-photo"
      src={resource.data.imagen}
      alt={name}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  ) : (
    <EmptyPhoto name={name} />
  );
}
export function ProductPhotoField({
  product,
  ...props
}: {
  product?: { id: string; nombre: string; foto_version?: number };
  value: string | null | undefined;
  onChange: (value: string | null) => void;
  onBusyChange?: (busy: boolean) => void;
}) {
  return (
    <PhotoPicker
      {...props}
      initialPhoto={
        product?.foto_version ? (
          <ProductPhoto id={product.id} version={product.foto_version} name={product.nombre} />
        ) : undefined
      }
    />
  );
}

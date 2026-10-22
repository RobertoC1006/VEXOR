import { useRef, useState } from 'react';
import { Camera, ImagePlus, Package } from 'lucide-react';
import { api } from '../../../compartido/api/api';
import { useResource } from '../../../compartido/api/use-resource';
import { Button, Notice } from '../../../compartido/componentes/ui';
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
export async function prepareProductPhoto(file: File): Promise<string> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type))
    throw new Error('Elige una foto JPG, PNG o WebP.');
  if (file.size > 20 * 1024 * 1024) throw new Error('La foto debe pesar menos de 20 MB.');
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    if (
      !image.naturalWidth ||
      !image.naturalHeight ||
      image.naturalWidth * image.naturalHeight > 50000000
    )
      throw new Error('No pudimos preparar esa foto. Prueba una imagen más pequeña.');
    const canvas = document.createElement('canvas');
    for (const size of [320, 240, 160]) {
      const ratio = Math.min(1, size / Math.max(image.naturalWidth, image.naturalHeight));
      canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio));
      const context = canvas.getContext('2d');
      if (!context) throw new Error('No pudimos preparar la foto en este navegador.');
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      for (const quality of [0.8, 0.6, 0.4]) {
        const result = canvas.toDataURL('image/jpeg', quality);
        if (result.startsWith('data:image/jpeg;base64,') && result.length <= 20000) return result;
      }
    }
    throw new Error('No pudimos reducir esa foto. Elige otra imagen.');
  } finally {
    URL.revokeObjectURL(url);
  }
}
export function ProductPhotoField({
  product,
  value,
  onChange,
  onBusyChange,
}: {
  product?: { id: string; nombre: string; foto_version?: number };
  value: string | null | undefined;
  onChange: (value: string | null) => void;
  onBusyChange?: (busy: boolean) => void;
}) {
  const camera = useRef<HTMLInputElement>(null),
    gallery = useRef<HTMLInputElement>(null);
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  async function choose(input: HTMLInputElement) {
    const file = input.files?.[0];
    if (!file) return;
    setError('');
    setBusy(true);
    onBusyChange?.(true);
    try {
      onChange(await prepareProductPhoto(file));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      onBusyChange?.(false);
      input.value = '';
    }
  }
  return (
    <section className="photo-field" aria-label="Foto del producto">
      <div>
        {typeof value === 'string' ? (
          <img className="product-photo" src={value} alt="Vista previa del producto" />
        ) : value !== null && product ? (
          <ProductPhoto id={product.id} version={product.foto_version} name={product.nombre} />
        ) : (
          <EmptyPhoto name="este producto" />
        )}
      </div>
      <div>
        <h3>
          Foto del producto <small>(opcional)</small>
        </h3>
        <p className="field-hint">
          Toma una foto o elígela de tu galería. Se guardará una miniatura al guardar la ficha.
        </p>
        <div className="row-actions">
          <Button
            type="button"
            variant="secondary"
            disabled={busy}
            onClick={() => camera.current?.click()}
          >
            <Camera size={17} />
            Tomar foto
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={busy}
            onClick={() => gallery.current?.click()}
          >
            <ImagePlus size={17} />
            Elegir foto
          </Button>
          {(typeof value === 'string' || (value !== null && !!product?.foto_version)) && (
            <Button type="button" variant="ghost" onClick={() => onChange(null)}>
              Quitar foto
            </Button>
          )}
        </div>
        {busy && <p role="status">Preparando foto…</p>}
        {error && <Notice>{error}</Notice>}
      </div>
      <input
        ref={camera}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        aria-label="Tomar foto del producto"
        className="visually-hidden"
        tabIndex={-1}
        onChange={(e) => void choose(e.target)}
      />
      <input
        ref={gallery}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        aria-label="Elegir foto del producto"
        className="visually-hidden"
        tabIndex={-1}
        onChange={(e) => void choose(e.target)}
      />
    </section>
  );
}

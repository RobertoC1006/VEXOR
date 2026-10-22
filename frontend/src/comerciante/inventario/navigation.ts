export function inventoryLink(
  base: string,
  {
    productId,
    localId,
    count = false,
    status,
  }: { productId?: string; localId?: string; count?: boolean; status?: 'bajo' | 'pendiente' } = {},
) {
  const query = new URLSearchParams();
  if (productId) query.set('producto', productId);
  if (localId) query.set('local', localId);
  if (count) query.set('contar', '1');
  if (status) query.set('estado', status);
  return `${base}/inventario${query.size ? '?' + query : ''}`;
}

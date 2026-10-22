export interface Attribute {
  nombre: string;
  valor: string;
}
export type RegistrationLevel = 'simple' | 'intermedio' | 'avanzado';
export interface Product {
  foto_version?: number;
  combinaciones_total?: number;
  precios_pendientes?: number;
  precio_min?: string | null;
  precio_max?: string | null;
  stock?: { cantidad: number | null; confirmados: number; total: number };
  categoria_id: string | null;
  ejes_variantes: string[];
  nivel_registro: RegistrationLevel;
  caracteristicas: Attribute[];
  producto_padre_id: string | null;
  id: string;
  negocio_id: string;
  nombre: string;
  alias: string | null;
  descripcion: string | null;
  codigo: string | null;
  precio: string | null;
  costo: string | null;
  activo: boolean;
  version: number;
}
const soles = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' });
export const priceLabel = (value: string | null) =>
  value === null ? 'Precio pendiente' : soles.format(Number(value));

export function catalogPrice(product: Product) {
  if (product.nivel_registro !== 'avanzado') return priceLabel(product.precio);
  if (product.precio_min == null) return 'Precio pendiente';
  if (product.precios_pendientes) return `Desde ${priceLabel(product.precio_min)}`;
  return product.precio_min === product.precio_max
    ? priceLabel(product.precio_min)
    : `${priceLabel(product.precio_min)} – ${priceLabel(product.precio_max ?? null)}`;
}

export interface Attribute {
  nombre: string;
  valor: string;
}
export type RegistrationLevel = 'simple' | 'intermedio' | 'avanzado';
export interface Product {
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

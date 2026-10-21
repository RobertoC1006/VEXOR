export interface LocalLocation {
  mercado: string | null;
  pabellon: string | null;
  numero_puesto: string | null;
  referencia: string | null;
}
export interface BusinessLocal extends LocalLocation {
  id: string;
  negocio_id: string;
  nombre: string;
  activo: boolean;
  habilitado_venta: boolean;
  creado_en: string;
  actualizado_en: string;
}

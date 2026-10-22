export interface LocalSummary {
  id: string;
  nombre: string;
  habilitado_venta: boolean;
  total: number;
  confirmados: number;
  unidades: number;
  alertas: number;
  sin_minimo: number;
}
export interface BusinessSummary {
  catalogo: { productos: number; combinaciones: number } | null;
  locales: LocalSummary[];
  alertas: {
    id: string;
    nombre: string;
    modelo_nombre: string | null;
    local_id: string;
    local_nombre: string;
    cantidad: number;
    minimo: number;
    foto_version: number;
  }[];
  actividad: {
    tipo: 'producto' | 'conteo';
    id: string;
    nombre: string;
    local_id: string | null;
    local_nombre: string | null;
    fecha: string;
  }[];
}

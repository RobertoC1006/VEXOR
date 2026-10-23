export interface InventoryItem {
  minimo?: number | null;
  minimo_version?: number;
  foto_version?: number;
  precio?: string | null;
  caracteristicas?: { nombre: string; valor: string }[];
  producto_padre_id?: string | null;
  modelo_nombre?: string | null;
  id: string;
  nombre: string;
  nombre_completo?: string;
  alias: string | null;
  codigo: string | null;
  activo: boolean;
  estado: 'pendiente' | 'preparacion' | 'confirmado';
  cantidad: number | null;
  referencia: string | null;
  version: number;
  confirmado_en: string | null;
}
export interface InventoryPermissions {
  transferir?: boolean;
  recibir?: boolean;
  ajustar?: boolean;
  ver: boolean;
  contar: boolean;
  confirmar: boolean;
}

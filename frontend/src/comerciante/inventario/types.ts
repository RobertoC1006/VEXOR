export interface InventoryItem {
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
  ver: boolean;
  contar: boolean;
  confirmar: boolean;
}

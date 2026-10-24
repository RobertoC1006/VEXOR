import type { Product } from '../productos/types';
import type { InventoryPermissions } from './types';
export interface StockLocal extends InventoryPermissions {
  id: string;
  nombre: string;
  habilitado_venta: boolean;
  transferir: boolean;
  recibir: boolean;
  ajustar: boolean;
}
export interface StockCell {
  local_id: string;
  producto_id: string;
  cantidad: number | null;
  estado: string;
  minimo: number | null;
}
export interface StockDetail {
  producto: Product;
  seleccionado: string;
  locales: StockLocal[];
  combinaciones: Product[];
  existencias: StockCell[];
  transitos: { producto_id: string; cantidad: number }[];
}
export interface Movement {
  id: string;
  tipo: 'ajuste' | 'salida' | 'recepcion' | 'venta';
  local_id: string;
  destino_id: string | null;
  producto_id: string;
  nombre: string;
  cantidad: number;
  recibidas: number;
  motivo: string;
  creado_en: string;
  actor_id: string;
}
export type StockAction =
  | { tipo: 'ajuste' | 'salida'; product: Product; local: StockLocal; stock: number }
  | { tipo: 'recepcion'; movement: Movement; local: StockLocal };

import type { Attribute } from '../productos/types';
export interface Presentation {
  codigo?: string | null;
  id: string;
  nombre: string;
  unidades: number;
  precio: string;
}
export interface PosProduct {
  presentacion_escaneada?: string | null;
  id: string;
  nombre: string;
  modelo_nombre: string;
  producto_padre_id: string | null;
  codigo: string | null;
  precio: string | null;
  foto_id: string;
  foto_version: number;
  caracteristicas: Attribute[];
  stock: number | null;
  estado: string | null;
  minimo: number | null;
  presentaciones: Presentation[];
}
export interface CartLine {
  snapshotPrice?: string;
  unavailable?: boolean;
  key: string;
  product: PosProduct;
  presentation?: Presentation;
  quantity: number;
}
export interface PosSetup {
  locales: { id: string; nombre: string; descontar: boolean }[];
  politica: { limite_descuento: string; propietario: boolean };
}
export interface Sale {
  id: string;
  operacion_id: string;
  total: string;
  subtotal: string;
  descuento: string;
  pagos: { efectivo: string; yape: string; plin: string };
  efectivo_recibido: string;
  vuelto: string;
  creado_en: string;
  lineas?: { nombre: string; presentacion: string; cantidad: number; precio: string }[];
}
export interface ChargeBody {
  carrito_id?: string;
  carrito_version?: number;
  operacion_id: string;
  local_id: string;
  lineas: {
    producto_id: string;
    presentacion_id?: string;
    cantidad: number;
    precio_esperado: string;
    unidades_esperadas: number;
  }[];
  descuento: string;
  pagos: { efectivo: string; yape: string; plin: string };
  efectivo_recibido: string;
}
export type CartContent = Pick<ChargeBody, 'lineas' | 'descuento'>;
export type CheckoutBody = Omit<ChargeBody, 'operacion_id' | 'pagos' | 'efectivo_recibido'>;
export interface WaitingCart {
  id: string;
  local_id: string;
  nombre: string;
  version: number;
  contenido: CartContent;
  creado_en: string;
  actualizado_en: string;
  resumen?: {
    producto_id: string;
    presentacion_id?: string | null;
    nombre: string;
    modelo_nombre: string;
    presentacion: string;
  }[];
}
export interface CartDemand {
  producto_id: string;
  nombre: string;
  cantidad: string;
  disponible: number | null;
  estado: string | null;
}
export interface WaitingCartsPage {
  items: WaitingCart[];
  has_more?: boolean;
  total: number;
  demanda: CartDemand[];
}

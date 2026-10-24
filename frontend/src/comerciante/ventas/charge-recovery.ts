import type { ChargeBody } from './types';
import { cents } from './amounts';
export const chargeStorageKey = (member: string, base: string) => `vexor:cobro:${member}:${base}`;

export function readPendingCharge(key: string): ChargeBody | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(key) ?? 'null');
    return value &&
      typeof value.operacion_id === 'string' &&
      typeof value.local_id === 'string' &&
      Array.isArray(value.lineas) &&
      value.lineas.length > 0 &&
      value.lineas.length <= 100 &&
      value.lineas.every(
        (line: any) =>
          line &&
          typeof line.producto_id === 'string' &&
          Number.isInteger(line.cantidad) &&
          line.cantidad > 0 &&
          typeof line.precio_esperado === 'string' &&
          cents(line.precio_esperado) !== null,
      ) &&
      typeof value.descuento === 'string' &&
      cents(value.descuento) !== null &&
      typeof value.efectivo_recibido === 'string' &&
      cents(value.efectivo_recibido) !== null &&
      value.pagos &&
      ['efectivo', 'yape', 'plin'].every(
        (method) => typeof value.pagos[method] === 'string' && cents(value.pagos[method]) !== null,
      )
      ? (value as ChargeBody)
      : null;
  } catch {
    return null;
  }
}

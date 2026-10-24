import { moneyValue } from '../../compartido/dinero/money';
import type { CartLine } from './types';
const format = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' });
export const soles = (cents: number) => format.format(cents / 100);
export const decimal = (cents: number) => (cents / 100).toFixed(2);
export function suggestedTotals(subtotal: number, limit: number): number[] {
  const nearest = Math.floor((subtotal - 1) / 500) * 500;
  return [nearest, nearest - 500].filter((total) => total > 0 && subtotal - total <= limit);
}
export function cents(value: string): number | null {
  if (!/^\d{1,12}(?:[.,]\d{1,2})?$/.test(value.trim())) return null;
  const [whole, fraction = ''] = moneyValue(value)!.split('.');
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
}
export const unitPrice = (line: CartLine) =>
  cents(line.presentation?.precio ?? line.product.precio ?? line.snapshotPrice ?? '') ?? 0;
export const subtotal = (lines: CartLine[]) =>
  lines.reduce((sum, line) => sum + unitPrice(line) * line.quantity, 0);
export function payment(total: number, yape: string, plin: string, received: string) {
  const y = cents(yape),
    p = cents(plin),
    r = cents(received);
  if (y === null || p === null || r === null || y + p > total) return null;
  const cash = total - y - p;
  if (cash === 0 && r !== 0) return null;
  return {
    cash,
    yape: y,
    plin: p,
    received: r,
    remaining: Math.max(0, cash - r),
    change: Math.max(0, r - cash),
  };
}
export function stockIssue(lines: CartLine[]) {
  if (lines.some((line) => line.unavailable))
    return 'Un producto o presentación ya no está disponible. Retíralo del carrito.';
  if (lines.length > 100)
    return 'El carrito admite hasta 100 líneas. Completa esta venta antes de agregar más productos.';
  if (lines.some((line) => !line.presentation && line.product.precio === null))
    return 'Registra el precio en el catálogo antes de vender.';
  const quantities = new Map<string, number>();
  for (const line of lines) {
    const quantity =
      (quantities.get(line.product.id) ?? 0) + line.quantity * (line.presentation?.unidades ?? 1);
    quantities.set(line.product.id, quantity);
    if (line.product.estado !== 'confirmado')
      return 'Este artículo tiene el conteo pendiente. Su venta se realiza fuera de VEXOR.';
    if (quantity > (line.product.stock ?? 0))
      return `Stock insuficiente para ${line.product.modelo_nombre}. Revisa las existencias antes de cobrar.`;
  }
  const total = subtotal(lines);
  if (!Number.isSafeInteger(total) || total > 99999999999999)
    return 'El importe del carrito supera el máximo permitido.';
  return null;
}

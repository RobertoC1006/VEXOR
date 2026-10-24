import { cents, decimal, unitPrice } from './amounts';
import type { CartContent, CartLine, PosProduct, WaitingCart } from './types';
export function cartContent(lines: CartLine[], discount: number): CartContent {
  return {
    descuento: decimal(discount),
    lineas: lines.map((l) => ({
      producto_id: l.product.id,
      presentacion_id: l.presentation?.id,
      cantidad: l.quantity,
      precio_esperado: decimal(unitPrice(l)),
      unidades_esperadas: l.presentation?.unidades ?? 1,
    })),
  };
}
export function restoreCart(cart: WaitingCart, products: PosProduct[]): CartLine[] {
  return cart.contenido.lineas.map((item) => {
    const product = products.find((p) => p.id === item.producto_id);
    const pr = item.presentacion_id
      ? product?.presentaciones.find((p) => p.id === item.presentacion_id)
      : undefined;
    const info = cart.resumen?.find(
      (p) =>
        p.producto_id === item.producto_id &&
        (p.presentacion_id ?? null) === (item.presentacion_id ?? null),
    );
    const fallback: PosProduct = {
      id: item.producto_id,
      nombre: info?.nombre ?? 'Producto no disponible',
      modelo_nombre: info?.modelo_nombre ?? 'Producto no disponible',
      producto_padre_id: null,
      codigo: null,
      precio: item.precio_esperado,
      foto_id: item.producto_id,
      foto_version: 0,
      caracteristicas: [],
      stock: null,
      estado: null,
      minimo: null,
      presentaciones: [],
    };
    return {
      key: `${item.producto_id}:${item.presentacion_id ?? 'unidad'}`,
      product: product ?? fallback,
      snapshotPrice: item.precio_esperado,
      presentation:
        pr ??
        (item.presentacion_id
          ? {
              id: item.presentacion_id,
              nombre: info?.presentacion ?? 'Presentación no disponible',
              unidades: item.unidades_esperadas,
              precio: item.precio_esperado,
            }
          : undefined),
      quantity: item.cantidad,
      unavailable: !product || (!!item.presentacion_id && !pr),
    };
  });
}
export function waitingTotal(cart: WaitingCart) {
  return (
    cart.contenido.lineas.reduce((n, l) => n + (cents(l.precio_esperado) ?? 0) * l.cantidad, 0) -
    (cents(cart.contenido.descuento) ?? 0)
  );
}

import { useEffect, useRef, useState } from 'react';
import { api } from '../../compartido/api/api';
import { useAction } from '../../compartido/api/use-action';
import { useResource } from '../../compartido/api/use-resource';
import { usePageState } from '../../compartido/componentes/pagination';
import type { Page } from '../../compartido/tipos/types';
import { cartContent, restoreCart } from './cart-content';
import { cents } from './amounts';
import type { CartLine, PosProduct, WaitingCart, WaitingCartsPage, CheckoutBody } from './types';
export function useHeldCarts({
  base,
  local,
  lines,
  discount,
  setLines,
  setDiscount,
  setMessage,
}: {
  base: string;
  local: string;
  lines: CartLine[];
  discount: number;
  setLines: (v: CartLine[]) => void;
  setDiscount: (v: number) => void;
  setMessage: (v: string) => void;
}) {
  const [active, setActive] = useState<WaitingCart | null>(null),
    [name, setName] = useState('');
  const attempt = useRef<{ id: string; version: number; mode: 'new' | 'active' } | null>(null);
  const action = useAction(),
    pagination = usePageState(local);
  const path = `${base}/ventas/carritos`;
  const url = `${path}?local_id=${local}&limit=${pagination.pageSize}&offset=${pagination.offset}${active ? `&excluir_id=${active.id}` : ''}`;
  const resource = useResource(url, (signal) =>
    local
      ? api<WaitingCartsPage>(url, { signal })
      : Promise.resolve({ items: [], total: 0, demanda: [] }),
  );
  useEffect(() => {
    if (!local) return;
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') void resource.refresh();
    }, 15000);
    return () => clearInterval(timer);
  }, [local, resource.refresh]);
  function reset() {
    setActive(null);
    setName('');
    pagination.setOffset(0);
    setLines([]);
    setDiscount(0);
    attempt.current = null;
  }
  async function save(asNew = false) {
    if (!lines.length) throw new Error('Agrega productos antes de guardar el carrito.');
    const mode: 'new' | 'active' = asNew || !active ? 'new' : 'active';
    const target =
      attempt.current?.mode === mode
        ? attempt.current
        : mode === 'active' && active
          ? { id: active.id, version: active.version, mode }
          : { id: crypto.randomUUID(), version: 0, mode };
    attempt.current = target;
    const saved = await api<WaitingCart>(`${path}/${target.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        ...cartContent(lines, discount),
        local_id: local,
        version: target.version,
        nombre: name.trim() || null,
      }),
    });
    attempt.current = null;
    setActive(saved);
    setName(saved.nombre);
    return saved;
  }
  async function hold(asNew = false) {
    return action.run(async () => {
      const saved = await save(asNew);
      reset();
      setMessage(`${saved.nombre} quedó en espera. Puedes atender otra venta.`);
      void resource.refresh();
    });
  }
  async function resume(cart: WaitingCart) {
    return action.run(async () => {
      if (active?.id === cart.id) return;
      if (lines.length) await save();
      const fresh = await api<WaitingCart>(`${path}/${cart.id}`);
      if (fresh.local_id !== local) throw new Error('El carrito pertenece a otro puesto.');
      const ids = [...new Set(fresh.contenido.lineas.map((l) => l.producto_id))].join(',');
      const catalog = await api<Page<PosProduct>>(
        `${base}/ventas/catalogo?local_id=${local}&ids=${ids}&limit=100`,
      );
      setLines(restoreCart({ ...fresh, resumen: cart.resumen }, catalog.items));
      setDiscount(cents(fresh.contenido.descuento) ?? 0);
      setActive(fresh);
      setName(fresh.nombre);
      attempt.current = null;
      setMessage(
        `${fresh.nombre} retomado. Revisa los precios, presentaciones y existencias actualizados antes de cobrar.`,
      );
    });
  }
  async function prepare() {
    if (!active) return { local_id: local, ...cartContent(lines, discount) };
    let body: CheckoutBody | undefined;
    const ok = await action.run(async () => {
      const saved = await save();
      body = {
        local_id: local,
        ...cartContent(lines, discount),
        carrito_id: saved.id,
        carrito_version: saved.version,
      };
    });
    return ok ? body : null;
  }
  async function clear() {
    return action.run(async () => {
      if (active)
        await api(`${path}/${active.id}/descartar`, {
          method: 'POST',
          body: JSON.stringify({ version: active.version }),
        });
      reset();
      void resource.refresh();
    });
  }
  function complete() {
    reset();
    void resource.refresh();
  }
  const demand = new Map(
    (resource.data?.demanda ?? []).map((d) => [d.producto_id, { ...d, units: BigInt(d.cantidad) }]),
  );
  for (const line of lines) {
    const d = demand.get(line.product.id) ?? {
      producto_id: line.product.id,
      nombre: line.product.modelo_nombre,
      cantidad: '0',
      disponible: line.product.stock,
      estado: line.product.estado,
      units: 0n,
    };
    d.units += BigInt(line.quantity * (line.presentation?.unidades ?? 1));
    demand.set(line.product.id, d);
  }
  const warnings = [...demand.values()].filter(
    (d) => d.estado === 'confirmado' && d.disponible !== null && d.units > BigInt(d.disponible),
  );
  return {
    active,
    name,
    setName,
    resource,
    pagination,
    busy: action.busy,
    error: action.error,
    hold,
    resume,
    prepare,
    clear,
    complete,
    warnings,
  };
}

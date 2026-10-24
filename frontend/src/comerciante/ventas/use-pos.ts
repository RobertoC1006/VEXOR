import { useHeldCarts } from './use-held-carts';
import type { CheckoutBody } from './types';
import { useEffect, useRef, useState } from 'react';
import { api } from '../../compartido/api/api';
import { useResource } from '../../compartido/api/use-resource';
import { usePageState } from '../../compartido/componentes/pagination';
import { useBusiness } from '../negocio/context';
import type { Page } from '../../compartido/tipos/types';
import { readPendingCharge, chargeStorageKey } from './charge-recovery';
import { cents, stockIssue, subtotal } from './amounts';
import type { CartLine, PosProduct, PosSetup, Presentation, Sale } from './types';
export function usePos() {
  const { base, can, access } = useBusiness();
  const pending = useRef(readPendingCharge(chargeStorageKey(access.miembro_id, base)));
  const [checkoutBody, setCheckoutBody] = useState<CheckoutBody | null>(null);
  const scanned = useRef('');
  const fallbackToSearch = useRef(false);
  const setup = useResource(`${base}/ventas/pos`, (signal) =>
    api<PosSetup>(`${base}/ventas/pos`, { signal }),
  );
  const [scanTick, setScanTick] = useState(0);
  const [local, setLocal] = useState(''),
    [search, setSearch] = useState(''),
    [query, setQuery] = useState(''),
    [code, setCode] = useState('');
  const [lines, setLines] = useState<CartLine[]>([]),
    [discount, setDiscount] = useState(0),
    [message, setMessage] = useState('');
  const [modal, setModal] = useState<
    'checkout' | 'policy' | 'history' | 'clear' | 'waiting' | null
  >(pending.current ? 'checkout' : null);
  const [inventoryProduct, setInventoryProduct] = useState<PosProduct | null>(null);
  const [editingPresentation, setEditingPresentation] = useState<Presentation | undefined>();
  const [choice, setChoice] = useState<PosProduct | null>(null),
    [presentation, setPresentation] = useState<PosProduct | null>(null),
    [receipt, setReceipt] = useState<Sale | null>(null);
  const p = usePageState(`${local}:${query}:${code}`, 10);
  const selectedLocal = local || setup.data?.locales[0]?.id || '';
  const held = useHeldCarts({
    base,
    local: selectedLocal,
    lines,
    discount,
    setLines,
    setDiscount,
    setMessage,
  });
  const url = `${base}/ventas/catalogo?local_id=${selectedLocal}&buscar=${encodeURIComponent(query)}&codigo=${encodeURIComponent(code)}&limit=${p.pageSize}&offset=${p.offset}`;
  const catalog = useResource(url, (signal) =>
    selectedLocal
      ? api<Page<PosProduct>>(url.replace('&codigo=&', '&'), { signal })
      : Promise.resolve({ items: [], limit: 10, offset: 0 }),
  );
  useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), 250);
    return () => clearTimeout(timer);
  }, [search]);
  const sum = subtotal(lines);
  const policy = setup.data?.politica;
  const discountAllowed =
    !!policy?.propietario || !!setup.data?.locales.find((l) => l.id === selectedLocal)?.descontar;
  const discountLimit = policy?.propietario ? sum : (cents(policy?.limite_descuento ?? '0') ?? 0);
  const issue =
    stockIssue(lines) ??
    (discount > 0 && (!discountAllowed || discount > discountLimit)
      ? 'El descuento de este carrito supera tus permisos. Ajústalo o quítalo antes de cobrar.'
      : null);
  async function openCheckout() {
    const body = await held.prepare();
    if (body) {
      setCheckoutBody(body);
      setModal('checkout');
    }
  }
  function add(product: PosProduct, pr?: Presentation) {
    const key = `${product.id}:${pr?.id ?? 'unidad'}`;
    const next = lines.some((l) => l.key === key)
      ? lines.map((l) => (l.key === key ? { ...l, quantity: l.quantity + 1 } : l))
      : [...lines, { key, product, presentation: pr, quantity: 1 }];
    const problem = stockIssue(next);
    if (problem) {
      setMessage(problem);
      return;
    }
    setLines(next);
    setMessage('');
    setChoice(null);
  }
  function choose(product: PosProduct) {
    if (product.estado !== 'confirmado') {
      setMessage(
        'Conteo pendiente: este artículo se vende fuera de VEXOR hasta confirmar su inventario.',
      );
      return;
    }
    if (product.presentaciones.length) setChoice(product);
    else if (product.precio !== null) add(product);
    else setMessage('Registra el precio en el catálogo antes de vender.');
  }
  useEffect(() => {
    if (!code || scanned.current === code || !catalog.data) return;
    scanned.current = code;
    const found = catalog.data.items;
    if (!found.length && fallbackToSearch.current) {
      fallbackToSearch.current = false;
      setSearch(code);
      setQuery(code);
      setCode('');
      return;
    }
    if (found.length === 1) {
      const product = found[0];
      const pr = product.presentaciones.find((pr) => pr.id === product.presentacion_escaneada);
      if (pr) add(product, pr);
      else if (product.codigo === code) choose(product);
    }
  }, [code, catalog.data, scanTick]);
  function scan(value: string, allowTextSearch = false) {
    scanned.current = '';
    fallbackToSearch.current = allowTextSearch;
    setScanTick((n) => n + 1);
    setSearch('');
    setQuery('');
    setCode(value.trim());
  }
  async function refresh() {
    await Promise.all([catalog.refresh(), held.resource.refresh()]);
    if (!lines.length) return;
    try {
      const ids = [...new Set(lines.map((line) => line.product.id))].join(',');
      const current = await api<Page<PosProduct>>(
        `${base}/ventas/catalogo?local_id=${selectedLocal}&ids=${ids}&limit=100`,
      );
      setLines((previous) =>
        previous.map((line) => {
          const product = current.items.find((item) => item.id === line.product.id);
          const pr = line.presentation
            ? product?.presentaciones.find((item) => item.id === line.presentation!.id)
            : undefined;
          if (!product || (line.presentation && !pr)) return { ...line, unavailable: true };
          return { ...line, product, presentation: pr, unavailable: false };
        }),
      );
      setMessage('Carrito actualizado. Revisa precios y existencias antes de cobrar.');
    } catch (error) {
      setMessage((error as Error).message);
    }
  }
  function success(sale: Sale) {
    setMessage('');
    pending.current = null;
    setReceipt(sale);
    held.complete();
    setCheckoutBody(null);
    setModal(null);
    void catalog.refresh();
  }
  return {
    held,
    checkoutBody,
    openCheckout,
    inventoryProduct,
    setInventoryProduct,
    base,
    can,
    pending,
    setup,
    setLocal,
    search,
    setSearch,
    code,
    setCode,
    lines,
    setLines,
    discount,
    setDiscount,
    message,
    modal,
    setModal,
    editingPresentation,
    setEditingPresentation,
    choice,
    setChoice,
    presentation,
    setPresentation,
    receipt,
    setReceipt,
    p,
    selectedLocal,
    catalog,
    sum,
    issue,
    policy,
    discountAllowed,
    discountLimit,
    add,
    choose,
    scan,
    refresh,
    success,
  };
}

import type { Attribute, Product } from './types';

export interface CombinationDraft {
  key: string;
  original?: Product;
  nombre: string;
  codigo: string;
  precio: string;
  costo: string;
  activo: boolean;
  caracteristicas: Attribute[];
}
export const cleanAttributes = (attributes: Attribute[]) =>
  attributes
    .filter((a) => a.nombre.trim() && a.valor.trim())
    .map((a) => ({ nombre: a.nombre.trim(), valor: a.valor.trim() }));
export function moneyValue(value: string) {
  if (!value.trim()) return null;
  const [whole, decimal] = value.trim().replace(',', '.').split('.');
  return `${whole.replace(/^0+(?=\d)/, '')}${decimal === undefined ? '' : `.${decimal}`}`;
}
export function initialAxes(
  product?: Product,
  combinations: Product[] = [],
  suggested: string[] = [],
) {
  const names = [
    ...(product?.ejes_variantes ?? []),
    ...combinations.flatMap((c) => c.caracteristicas.map((a) => a.nombre)),
  ];
  return names.length
    ? names.filter(
        (name, index) =>
          names.findIndex((n) => n.toLocaleLowerCase() === name.toLocaleLowerCase()) === index,
      )
    : suggested;
}
export function combinationDraft(product?: Product, seed: Attribute[] = []): CombinationDraft {
  return {
    key: product?.id ?? crypto.randomUUID(),
    original: product,
    nombre: product?.nombre ?? '',
    codigo: product?.codigo ?? '',
    precio: product?.precio ?? '',
    costo: product?.costo ?? '',
    activo: product?.activo ?? true,
    caracteristicas: product?.caracteristicas ?? seed,
  };
}
export function combinationBody(row: CombinationDraft) {
  const caracteristicas = cleanAttributes(row.caracteristicas);
  return {
    nombre:
      row.nombre.trim() ||
      caracteristicas
        .map((a) => a.valor)
        .join(' / ')
        .slice(0, 160),
    codigo: row.codigo.trim() || null,
    precio: moneyValue(row.precio),
    costo: moneyValue(row.costo),
    activo: row.activo,
    caracteristicas,
    ...(row.original ? { id: row.original.id, version: row.original.version } : {}),
  };
}
export function changedCombination(row: CombinationDraft) {
  if (!row.original)
    return !!(
      row.nombre.trim() ||
      row.codigo.trim() ||
      row.precio.trim() ||
      row.costo.trim() ||
      cleanAttributes(row.caracteristicas).length
    );
  return (
    JSON.stringify(combinationBody(row)) !==
    JSON.stringify(combinationBody(combinationDraft(row.original)))
  );
}

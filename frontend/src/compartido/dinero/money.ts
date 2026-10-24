/** Normalize leading zeros without changing decimal separators or unfinished text. */
export function moneyInput(value: string) {
  return value.replace(/^0+(?=\d)/, '');
}
export function moneyValue(value: string) {
  if (!value.trim()) return null;
  const [whole, decimal] = moneyInput(value.trim()).replace(',', '.').split('.');
  return `${whole}${decimal === undefined ? '' : `.${decimal}`}`;
}

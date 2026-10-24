export function moneyValue(value: string) {
  if (!value.trim()) return null;
  const [whole, decimal] = value.trim().replace(',', '.').split('.');
  return `${whole.replace(/^0+(?=\d)/, '')}${decimal === undefined ? '' : `.${decimal}`}`;
}

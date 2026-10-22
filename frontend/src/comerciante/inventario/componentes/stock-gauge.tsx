export function stockCondition(quantity: number | null, minimum: number | null) {
  if (quantity === null) return 'Pendiente de contar';
  if (minimum === null) return 'Sin mínimo configurado';
  return quantity < minimum
    ? 'Stock bajo'
    : quantity === minimum
      ? 'En el mínimo'
      : 'Stock suficiente';
}
export function StockGauge({
  quantity,
  minimum,
  hint,
  lowCount = 0,
}: {
  lowCount?: number;
  quantity: number | null;
  minimum: number | null;
  hint?: string;
}) {
  const status =
    lowCount > 0
      ? `${lowCount} ${lowCount === 1 ? 'combinación' : 'combinaciones'} en alerta`
      : stockCondition(quantity, minimum);
  const monitored = quantity !== null && minimum !== null;
  const color =
    lowCount > 0 ? 'low' : monitored ? (quantity <= minimum ? 'low' : 'good') : 'unknown';
  const filled = monitored ? Math.min(1, quantity / minimum!) : 0;
  return (
    <div
      className={`stock-gauge ${color}`}
      aria-label={`${quantity === null ? 'Cantidad pendiente' : quantity + ' unidades'}. ${status}${minimum === null ? '' : '. Mínimo ' + minimum}`}
    >
      {monitored && (
        <svg viewBox="0 0 100 56" width="76" height="44" aria-hidden="true">
          {Array.from({ length: 25 }, (_, i) => {
            const angle = Math.PI + (i * Math.PI) / 24;
            return (
              <line
                key={i}
                x1={50 + 34 * Math.cos(angle)}
                y1={49 + 34 * Math.sin(angle)}
                x2={50 + 46 * Math.cos(angle)}
                y2={49 + 46 * Math.sin(angle)}
                className={(i + 1) / 25 <= filled ? 'filled' : 'unfilled'}
                strokeWidth="3"
              />
            );
          })}
        </svg>
      )}
      <strong className="stock-number">
        {quantity === null ? '—' : quantity}
        <span className="stock-unit"> unid.</span>
      </strong>
      <small>{status}</small>
      {minimum !== null && <small>Mínimo: {minimum}</small>}
      {hint && <small>{hint}</small>}
    </div>
  );
}

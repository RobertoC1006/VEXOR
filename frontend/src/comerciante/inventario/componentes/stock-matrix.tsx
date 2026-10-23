import { useState } from 'react';
import { ChoicePicker } from '../../../compartido/componentes/choice-picker';
import { ChoiceCards } from '../../../compartido/componentes/choice-cards';
import { Modal } from '../../../compartido/componentes/modal';
import { ClientPager, useClientPage } from '../../../compartido/componentes/pagination';
import type { Product } from '../../productos/types';
import type { StockCell } from '../stock-types';
const value = (p: Product, axis: string) =>
  p.caracteristicas.find((a) => a.nombre.toLocaleLowerCase() === axis.toLocaleLowerCase())?.valor ??
  'Sin especificar';
export function StockMatrix({
  products,
  axes,
  stocks,
  localId,
  selected,
  onSelect,
}: {
  products: Product[];
  axes: string[];
  stocks: StockCell[];
  localId: string;
  selected: string;
  onSelect: (id: string) => void;
}) {
  const names = Array.from(
    new Map(
      [...axes, ...products.flatMap((p) => p.caracteristicas.map((a) => a.nombre))].map((n) => [
        n.toLocaleLowerCase(),
        n,
      ]),
    ).values(),
  );
  const [choices, setChoices] = useState<Product[] | null>(null);
  const initialRow = names.find((n) => n.toLocaleLowerCase() === 'color') ?? names[0] ?? '';
  const initialCol =
    names.find((n) => n !== initialRow && n.toLocaleLowerCase() === 'talla') ??
    names.find((n) => n !== initialRow) ??
    '';
  const [row, setRow] = useState(initialRow),
    [column, setColumn] = useState(initialCol),
    [filters, setFilters] = useState<Record<string, string>>({});
  const extra = names.filter((n) => n !== row && n !== column);
  const filtered = products.filter((p) =>
    extra.every((n) => !filters[n] || value(p, n) === filters[n]),
  );
  const rows = useClientPage(
    Array.from(new Set(filtered.map((p) => value(p, row)))),
    `${row}:${column}:${JSON.stringify(filters)}`,
  );
  const columns = useClientPage(
    column ? Array.from(new Set(filtered.map((p) => value(p, column)))) : ['Unidades'],
    `${row}:${column}:${JSON.stringify(filters)}`,
  );
  const options = names.map((n) => ({
    id: n,
    title: n,
    description: 'Característica de la combinación',
  }));
  if (!names.length)
    return (
      <p className="field-hint">
        Las combinaciones sin características se eligen en la lista superior.
      </p>
    );
  return (
    <section className="stock-matrix" aria-label="Matriz de combinaciones">
      <h3>
        Combinaciones por {row}
        {column ? ` y ${column}` : ''}
      </h3>
      <p className="field-hint">
        Existencias del local seleccionado. Toca una cantidad para abrir esa combinación. «Por
        contar» conserva el conteo pendiente.
      </p>
      <div className="matrix-filters">
        {names.length > 2 && (
          <>
            <ChoicePicker
              label="Filas"
              value={row}
              options={options.filter((o) => o.id !== column)}
              onChange={setRow}
            />
            <ChoicePicker
              label="Columnas"
              value={column}
              options={options.filter((o) => o.id !== row)}
              onChange={setColumn}
            />
          </>
        )}
        {extra.map((n) => (
          <ChoicePicker
            key={n}
            label={`Filtrar ${n}`}
            value={filters[n] ?? ''}
            options={[
              { id: '', title: 'Todos', description: `Todos los valores de ${n}` },
              ...Array.from(new Set(products.map((p) => value(p, n)))).map((v) => ({
                id: v,
                title: v,
                description: n,
              })),
            ]}
            onChange={(v) => setFilters((f) => ({ ...f, [n]: v }))}
          />
        ))}
      </div>
      <ClientPager page={rows} />
      {columns.total > 5 && (
        <div aria-label="Paginación de columnas">
          <small>Columnas de {column}</small>
          <ClientPager page={columns} />
        </div>
      )}
      <div className="stock-table-scroll">
        <table className="stock-table">
          <thead>
            <tr>
              <th>{row}</th>
              {columns.items.map((c) => (
                <th key={c}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.items.map((r) => (
              <tr key={r}>
                <th>{r}</th>
                {columns.items.map((c) => {
                  const matches = filtered.filter(
                    (p) => value(p, row) === r && (!column || value(p, column) === c),
                  );
                  const entries = matches.map((p) =>
                    stocks.find((s) => s.local_id === localId && s.producto_id === p.id),
                  );
                  const known =
                    matches.length > 0 &&
                    entries.every((s) => s?.estado === 'confirmado' && s.cantidad !== null);
                  const total = known ? entries.reduce((sum, s) => sum + s!.cantidad!, 0) : null;
                  return (
                    <td key={c}>
                      {matches.length ? (
                        <button
                          type="button"
                          className={`matrix-cell ${matches.some((p) => p.id === selected) ? 'selected' : ''}`}
                          onClick={() => {
                            if (matches.length === 1) onSelect(matches[0].id);
                            else setChoices(matches);
                          }}
                          aria-label={`${row} ${r}${column ? `, ${column} ${c}` : ''}: ${total === null ? 'por contar' : total + ' unidades'}${matches.length > 1 ? ', filtrar para elegir' : ''}`}
                        >
                          {total === null ? 'Por contar' : total}
                          {matches.length > 1 && <small>{matches.length} combinaciones</small>}
                        </button>
                      ) : (
                        '—'
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {choices && (
        <Modal label="Elegir combinación" onClose={() => setChoices(null)}>
          <ChoiceCards
            searchLabel="Buscar combinación"
            selected={selected}
            options={choices.map((p) => ({
              id: p.id,
              title: p.nombre,
              description: p.caracteristicas.map((a) => `${a.nombre}: ${a.valor}`).join(' · '),
            }))}
            onChoose={(id) => {
              onSelect(id);
              setChoices(null);
            }}
          />
        </Modal>
      )}
    </section>
  );
}

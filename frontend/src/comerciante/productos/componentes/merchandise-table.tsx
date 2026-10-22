import type { ReactNode } from 'react';
import { ProductPhoto } from './product-photo';
export interface MerchandiseRow {
  id: string;
  name: string;
  code: string | null;
  photoVersion?: number;
  model: string;
  details: string;
  price: string;
  stock: string;
  stockHint: string;
  active: boolean;
  actions: ReactNode;
}
export function MerchandiseTable({ rows }: { rows: MerchandiseRow[] }) {
  return (
    <div className="merchandise-table">
      <table>
        <thead>
          <tr>
            <th>Producto</th>
            <th>Modelo / Variante</th>
            <th>Precio</th>
            <th>Stock</th>
            <th>Estado</th>
            <th>
              <span className="visually-hidden">Acciones</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td data-label="Producto">
                <div className="merchandise-identity">
                  <ProductPhoto id={row.id} version={row.photoVersion} name={row.name} />
                  <div>
                    <h2>{row.name}</h2>
                    <small>{row.code ? `Código: ${row.code}` : 'Sin código'}</small>
                  </div>
                </div>
              </td>
              <td data-label="Modelo / Variante">
                <strong>{row.model}</strong>
                <small>{row.details}</small>
              </td>
              <td data-label="Precio">
                <strong className="money">{row.price}</strong>
              </td>
              <td data-label="Stock">
                <strong className="stock-number">{row.stock}</strong>
                <small>{row.stockHint}</small>
              </td>
              <td data-label="Estado">
                <span className={`badge ${row.active ? 'success' : 'neutral'}`}>
                  <span className="status-dot" />
                  {row.active ? 'Activo' : 'Pausado'}
                </span>
              </td>
              <td className="merchandise-actions">
                <div>{row.actions}</div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

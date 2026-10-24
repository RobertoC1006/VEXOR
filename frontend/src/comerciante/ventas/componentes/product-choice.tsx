import { Modal } from '../../../compartido/componentes/modal';
import { Button } from '../../../compartido/componentes/ui';
import { soles, cents } from '../amounts';
import type { PosProduct, Presentation } from '../types';
export function ProductChoice({
  product,
  canManage,
  onAdd,
  onManage,
  onStock,
  onClose,
}: {
  product: PosProduct;
  canManage: boolean;
  onAdd: (presentation?: Presentation) => void;
  onManage: (presentation?: Presentation) => void;
  onStock?: () => void;
  onClose: () => void;
}) {
  return (
    <Modal size="compact" label={`Presentación · ${product.nombre}`} onClose={onClose}>
      <div className="pos-form">
        <p>Disponible: {product.stock ?? 0} unidades base</p>
        <Button variant="secondary" disabled={product.precio === null} onClick={() => onAdd()}>
          Unidad · {product.precio === null ? 'Precio pendiente' : soles(cents(product.precio)!)}
        </Button>
        {product.presentaciones.map((p) => (
          <div className="pos-presentation-row" key={p.id}>
            <Button
              variant="secondary"
              disabled={p.unidades > (product.stock ?? 0)}
              onClick={() => onAdd(p)}
            >
              {p.nombre} · {p.unidades} unidades · {soles(cents(p.precio)!)}
            </Button>
            {canManage && (
              <Button variant="ghost" onClick={() => onManage(p)} aria-label={`Editar ${p.nombre}`}>
                Editar
              </Button>
            )}
          </div>
        ))}
        {canManage && (
          <Button variant="ghost" onClick={() => onManage()}>
            Crear presentación
          </Button>
        )}
        {onStock && (
          <Button variant="ghost" onClick={onStock}>
            Ver existencias
          </Button>
        )}
      </div>
    </Modal>
  );
}

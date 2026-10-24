import { cartContent } from '../cart-content';
import { WaitingCarts } from '../componentes/waiting-carts';
import { ConfirmationDialog } from '../../../compartido/componentes/confirmation-dialog';
import { StockDetail } from '../../inventario/componentes/stock-detail';
import { usePos } from '../use-pos';
import { Link } from 'react-router-dom';
import { CheckCircle2, History, Package, RefreshCw, Settings2, ShoppingBag } from 'lucide-react';
import { Button, Empty, Field, Notice } from '../../../compartido/componentes/ui';
import { SelectField } from '../../../compartido/componentes/form-controls';
import { Modal } from '../../../compartido/componentes/modal';
import { ResourceState } from '../../../compartido/componentes/feedback';
import { Pagination } from '../../../compartido/componentes/pagination';
import { ScanCodeButton } from '../../../compartido/escaneo/scan-code-button';
import { ProductPhoto } from '../../productos/componentes/product-photo';
import { Cart } from '../componentes/cart';
import { Checkout } from '../componentes/checkout';
import { PaymentDetail } from '../componentes/payment-detail';
import { PolicyForm, PresentationForm } from '../componentes/pos-settings';
import { ProductChoice } from '../componentes/product-choice';
import { SalesHistory } from '../componentes/sales-history';
import { cents, soles } from '../amounts';
import '../../estilos/pos.css';

export function PosPage() {
  const {
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
  } = usePos();
  const canReviewStock =
    (can('productos.ver') || can('productos.gestionar')) &&
    (can('inventario.ver') || can('inventario.contar') || can('inventario.confirmar'));
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">VENTAS</span>
          <h1>Punto de venta</h1>
          <p>Elige productos, prepara el carrito y cobra.</p>
        </div>
        <div className="pos-heading-actions">
          <Button
            variant="secondary"
            disabled={!selectedLocal || held.busy}
            onClick={() => setModal('waiting')}
          >
            Carritos en espera ({held.resource.data?.total ?? '…'})
          </Button>
          <Button variant="secondary" disabled={!selectedLocal} onClick={() => setModal('history')}>
            <History size={18} />
            Ventas
          </Button>
          {policy?.propietario && (
            <Button variant="secondary" onClick={() => setModal('policy')}>
              <Settings2 size={18} />
              Descuentos
            </Button>
          )}
        </div>
      </div>
      {!setup.data ? (
        <ResourceState error={setup.error} retry={setup.refresh} />
      ) : !setup.data.locales.length ? (
        <Empty title="No tienes un puesto disponible">
          El propietario debe habilitar un puesto y concederte permiso para registrar ventas.
        </Empty>
      ) : (
        <>
          {message && <Notice tone="info">{message}</Notice>}
          {held.error && (
            <Notice>
              {held.error}
              {held.active && (
                <Button
                  variant="secondary"
                  disabled={held.busy}
                  onClick={() => void held.hold(true)}
                >
                  Guardar como otro carrito
                </Button>
              )}
            </Notice>
          )}
          {held.warnings.length > 0 && (
            <Notice tone="info">
              Los carritos pueden superar el stock:{' '}
              {held.warnings
                .slice(0, 3)
                .map(
                  (w) =>
                    `${w.nombre}: ${w.units} unidades entre este carrito y los guardados, ${w.disponible} disponibles`,
                )
                .join('; ')}
              . No se reservan existencias; se comprobarán al cobrar.
            </Notice>
          )}
          <div className="pos-workspace">
            <section id="pos-catalog" className="pos-catalog" aria-label="Productos para vender">
              <div className="pos-toolbar">
                <SelectField
                  label="Puesto de venta"
                  value={selectedLocal}
                  disabled={lines.length > 0 || !!held.active || held.busy}
                  onChange={(e) => {
                    setLocal(e.target.value);
                    setDiscount(0);
                    setCode('');
                  }}
                >
                  {setup.data.locales.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.nombre}
                    </option>
                  ))}
                </SelectField>
                <Button
                  variant="ghost"
                  disabled={catalog.loading}
                  onClick={() => void refresh()}
                  aria-label="Actualizar disponibilidad"
                >
                  <RefreshCw size={19} />
                </Button>
              </div>
              <form
                className="pos-search"
                onSubmit={(e) => {
                  e.preventDefault();
                  scan(search, true);
                }}
              >
                <Field
                  id="pos-search"
                  label="Buscar o escanear producto"
                  placeholder="Nombre, característica o código"
                  disabled={held.busy}
                  value={search}
                  maxLength={160}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setCode('');
                  }}
                />
                <ScanCodeButton
                  label="Escanear"
                  disabled={held.busy}
                  onRead={(value) => scan(value)}
                />
              </form>
              {code && (
                <div className="pos-scan-result">
                  <span>Código: {code}</span>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setCode('');
                      setSearch('');
                    }}
                  >
                    Ver todos
                  </Button>
                </div>
              )}
              <p className="pos-catalog-caption">
                <Package size={16} />
                Existencias del puesto seleccionado
              </p>
              {!catalog.data ? (
                <ResourceState error={catalog.error} retry={catalog.refresh} />
              ) : (
                <>
                  {!catalog.data.items.length ? (
                    <Empty title={code ? 'Código no encontrado' : 'Sin productos para mostrar'}>
                      Prueba con otro nombre o revisa el catálogo del negocio.
                    </Empty>
                  ) : (
                    <div className="pos-product-grid">
                      {catalog.data.items.map((product) => (
                        <div key={product.id} className="pos-product-tile">
                          <button
                            disabled={held.busy}
                            className="pos-product-card"
                            onClick={() => choose(product)}
                          >
                            <ProductPhoto
                              id={product.foto_id}
                              version={product.foto_version}
                              name={product.modelo_nombre}
                            />
                            <strong>{product.modelo_nombre}</strong>
                            {product.producto_padre_id && <span>{product.nombre}</span>}
                            <b>
                              {product.precio === null
                                ? 'Precio pendiente'
                                : soles(cents(product.precio)!)}
                            </b>
                            <small
                              className={
                                product.estado !== 'confirmado' || (product.stock ?? 0) === 0
                                  ? 'pos-stock-warning'
                                  : ''
                              }
                            >
                              {product.estado !== 'confirmado'
                                ? 'Conteo pendiente'
                                : `${product.stock} unid.${product.minimo !== null && (product.stock ?? 0) <= product.minimo ? ' · Stock bajo' : ''}`}
                            </small>
                          </button>
                          {(can('productos.gestionar') || canReviewStock) && (
                            <Button variant="ghost" onClick={() => setChoice(product)}>
                              Opciones
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  <Pagination
                    offset={p.offset}
                    pageSize={p.pageSize}
                    more={!!catalog.data.has_more}
                    loading={catalog.loading}
                    onChange={p.setOffset}
                    onPageSize={p.setPageSize}
                  />
                </>
              )}
              {can('productos.ver') || can('productos.gestionar') ? (
                <Link className="pos-catalog-link" to={`${base}/productos`}>
                  Ir al catálogo para registrar productos o precios
                </Link>
              ) : (
                <p className="pos-catalog-caption">
                  Si falta un precio o conteo, consulta con el propietario.
                </p>
              )}
            </section>
            <Cart
              name={held.name}
              onName={held.setName}
              onHold={() => void held.hold()}
              onRemoveDiscount={() => setDiscount(0)}
              busy={held.busy}
              active={!!held.active}
              lines={lines}
              subtotal={sum}
              discount={discount}
              onQuantity={(key, quantity) => {
                setLines((previous) =>
                  previous
                    .map((l) => (l.key === key ? { ...l, quantity } : l))
                    .filter((l) => l.quantity > 0),
                );
                setDiscount(0);
              }}
              onDiscount={setDiscount}
              discountLimit={discountLimit}
              canDiscount={discountAllowed}
              onCharge={() => void openCheckout()}
              onClear={() => setModal('clear')}
              issue={issue}
            />
          </div>
        </>
      )}
      {lines.length > 0 && (
        <a href="#pos-cart" className="button primary pos-mobile-cart">
          Ver carrito ({lines.reduce((n, l) => n + l.quantity, 0)}){' '}
          <strong>{soles(sum - discount)}</strong>
        </a>
      )}
      {modal === 'waiting' && (
        <WaitingCarts held={held} hasCurrent={lines.length > 0} onClose={() => setModal(null)} />
      )}
      {inventoryProduct && (
        <StockDetail
          productId={inventoryProduct.id}
          localId={selectedLocal}
          onClose={() => setInventoryProduct(null)}
          onChanged={refresh}
        />
      )}
      {choice && (
        <ProductChoice
          product={choice}
          canManage={can('productos.gestionar')}
          onAdd={(pr) => add(choice, pr)}
          onStock={
            canReviewStock
              ? () => {
                  setInventoryProduct(choice);
                  setChoice(null);
                }
              : undefined
          }
          onClose={() => setChoice(null)}
          onManage={(pr) => {
            setEditingPresentation(pr);
            setPresentation(choice);
            setChoice(null);
          }}
        />
      )}
      {presentation && (
        <PresentationForm
          product={presentation}
          editing={editingPresentation}
          onClose={() => setPresentation(null)}
          onSaved={() => {
            setPresentation(null);
            void catalog.refresh();
          }}
        />
      )}
      {modal === 'policy' && (
        <PolicyForm
          value={policy?.limite_descuento ?? '0'}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            void setup.refresh();
          }}
        />
      )}
      {modal === 'history' && <SalesHistory local={selectedLocal} onClose={() => setModal(null)} />}
      {modal === 'clear' && (
        <ConfirmationDialog
          title={held.active ? 'Descartar carrito' : 'Vaciar carrito'}
          description={
            held.error ||
            (held.active
              ? 'Se quitará este carrito de la lista en espera, sin modificar existencias.'
              : 'Se quitarán los productos de este carrito.')
          }
          confirmLabel={held.active ? 'Descartar carrito' : 'Vaciar carrito'}
          size="compact"
          busy={held.busy}
          onCancel={() => setModal(null)}
          onConfirm={async () => {
            if (await held.clear()) setModal(null);
          }}
        />
      )}
      {modal === 'checkout' && (
        <Checkout
          lines={lines}
          total={
            pending.current
              ? pending.current.lineas.reduce(
                  (total, l) => total + (cents(l.precio_esperado) ?? 0) * l.cantidad,
                  0,
                ) - (cents(pending.current.descuento) ?? 0)
              : sum - discount
          }
          body={
            pending.current ??
            checkoutBody ?? { local_id: selectedLocal, ...cartContent(lines, discount) }
          }
          onClose={() => {
            pending.current = null;
            setModal(null);
          }}
          onSuccess={success}
        />
      )}
      {receipt && (
        <Modal size="compact" label="Venta registrada" onClose={() => setReceipt(null)}>
          <div className="pos-receipt">
            <CheckCircle2 size={44} />
            <strong>{soles(cents(receipt.total)!)}</strong>
            <PaymentDetail sale={receipt} />
            <small>Venta {receipt.id.slice(0, 8)} · Existencias actualizadas</small>
            <Button onClick={() => setReceipt(null)}>
              <ShoppingBag size={18} />
              Nueva venta
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}

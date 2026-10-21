import { Search } from 'lucide-react';
import { Button, Field } from '../../../compartido/componentes/ui';
import { ScanCodeButton } from '../../../compartido/escaneo/scan-code-button';

export function CatalogSearch({
  value,
  onChange,
  onSearch,
  onScan,
}: {
  value: string;
  onChange: (value: string) => void;
  onSearch: () => void;
  onScan: (code: string) => void;
}) {
  return (
    <form
      className="catalog-search"
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        onSearch();
      }}
    >
      <Field
        id="catalog-search"
        label="Buscar por nombre, alias o código"
        maxLength={160}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <Button type="submit" variant="secondary">
        <Search size={17} />
        Buscar
      </Button>
      <ScanCodeButton label="Escanear para buscar" onRead={onScan} />
    </form>
  );
}
export function CatalogPager({
  offset,
  more,
  loading,
  onChange,
}: {
  offset: number;
  more: boolean;
  loading: boolean;
  onChange: (offset: number) => void;
}) {
  return (
    <div className="catalog-pager" aria-label="Páginas de productos">
      <Button
        variant="secondary"
        disabled={loading || offset === 0}
        onClick={() => onChange(Math.max(0, offset - 25))}
      >
        Anterior
      </Button>
      <span>Página {Math.floor(offset / 25) + 1}</span>
      <Button variant="secondary" disabled={loading || !more} onClick={() => onChange(offset + 25)}>
        Siguiente
      </Button>
    </div>
  );
}

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

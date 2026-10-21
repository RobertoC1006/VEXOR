import { Search } from 'lucide-react';

export function SearchField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="platform-search">
      <Search size={17} />
      <span className="visually-hidden">Buscar negocio o correo</span>
      <input
        type="search"
        placeholder="Buscar negocio, propietario o correo…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

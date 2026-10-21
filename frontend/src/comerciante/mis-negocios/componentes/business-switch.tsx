import { Link } from 'react-router-dom';
import { Building2, ChevronDown } from 'lucide-react';

export function BusinessSwitch({ name }: { name: string }) {
  return (
    <Link className="business-switch" to="/negocios">
      <span className="icon-tile">
        <Building2 size={20} />
      </span>
      <span>
        <small>NEGOCIO ACTUAL</small>
        <strong>{name}</strong>
      </span>
      <ChevronDown size={18} />
    </Link>
  );
}

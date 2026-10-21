import { useState } from 'react';
import { Button } from '../../../compartido/componentes/ui';
import { SelectField } from '../../../compartido/componentes/form-controls';
import type { Permission } from '../types';

// Ayudas de selección para las capacidades actuales. No crean roles ni conceden acceso.
const suggestions = [
  {
    id: 'consulta',
    name: 'Solo consulta',
    description:
      'Para un visitante u otra persona que solo necesita consultar los locales que le asignes. No permite editar ni consultar el equipo.',
    codes: ['locales.ver'],
  },
  {
    id: 'locales',
    name: 'Gestión de locales',
    description:
      'Consulta y edición de locales asignados. Crear locales y pausarlos sigue reservado al propietario.',
    codes: ['locales.ver', 'locales.gestionar'],
  },
  {
    id: 'supervision',
    name: 'Consulta de locales y equipo',
    description:
      'Añade la consulta del equipo y su configuración de acceso. No permite cambiar sus permisos ni invitar personas.',
    codes: ['locales.ver', 'equipo.ver'],
  },
];

export function PermissionSuggestions({
  permissions,
  disabled,
  onSelect,
}: {
  permissions: Permission[];
  disabled: boolean;
  onSelect: (codes: string[]) => void;
}) {
  const [selected, setSelected] = useState('consulta');
  const available = suggestions.filter((suggestion) =>
    suggestion.codes.every((code) => permissions.some((permission) => permission.codigo === code)),
  );
  const suggestion = available.find((item) => item.id === selected) ?? available[0];
  if (!suggestion) return null;
  return (
    <div className="settings-stack">
      <SelectField
        label="Base de permisos sugerida"
        value={suggestion.id}
        disabled={disabled}
        onChange={(event) => setSelected(event.target.value)}
      >
        {available.map((item) => (
          <option value={item.id} key={item.id}>
            {item.name}
          </option>
        ))}
      </SelectField>
      <p className="field-hint">{suggestion.description}</p>
      <Button
        type="button"
        variant="secondary"
        disabled={disabled}
        onClick={() => onSelect([...suggestion.codes])}
      >
        Usar esta base
      </Button>
      <p className="field-hint">
        Reemplaza la selección del formulario. Puedes ajustarla antes de guardar. El nombre del rol
        no asigna permisos automáticamente.
      </p>
    </div>
  );
}

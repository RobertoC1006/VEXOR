import type { LocalLocation } from './types';

export const locationFields = [
  { key: 'mercado', label: 'Mercado', maxLength: 160, placeholder: 'Ej. Mercado Central' },
  { key: 'pabellon', label: 'Pabellón o sector', maxLength: 80, placeholder: 'Ej. Pabellón B' },
  {
    key: 'numero_puesto',
    label: 'Número de puesto o local',
    maxLength: 40,
    placeholder: 'Ej. B-024',
  },
  {
    key: 'referencia',
    label: 'Referencia',
    maxLength: 240,
    placeholder: 'Ej. Frente a la entrada principal',
  },
] as const;

export function formatLocation(location: LocalLocation) {
  return [
    location.mercado,
    location.pabellon,
    location.numero_puesto && `N.º ${location.numero_puesto}`,
    location.referencia,
  ]
    .filter(Boolean)
    .join(' · ');
}

export function locationValues(location?: LocalLocation): LocalLocation {
  return {
    mercado: location?.mercado?.trim() || null,
    pabellon: location?.pabellon?.trim() || null,
    numero_puesto: location?.numero_puesto?.trim() || null,
    referencia: location?.referencia?.trim() || null,
  };
}

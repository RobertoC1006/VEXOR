import type { IndividualPermission, Permission } from './types';

export function permissionLabel(permission: Permission) {
  return permission.codigo === 'locales.gestionar'
    ? 'Editar locales asignados'
    : permission.descripcion;
}

export function permissionState(permission: IndividualPermission, now = Date.now()) {
  if (permission.revocado_en) return 'Revocado';
  if (permission.vence_en && new Date(permission.vence_en).getTime() <= now) return 'Vencido';
  if (new Date(permission.inicia_en).getTime() > now) return 'Programado';
  return 'Vigente';
}
export function localDateInput(value: string | null) {
  if (!value) return '';
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 19);
}

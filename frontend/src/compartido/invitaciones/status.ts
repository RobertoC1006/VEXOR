import type { ManagedInvitation } from './types';
export type InvitationState = 'aceptada' | 'revocada' | 'vencida' | 'pendiente';
export function invitationState(
  invitation: Pick<ManagedInvitation, 'aceptada_en' | 'revocada_en' | 'vence_en'>,
  now = Date.now(),
): InvitationState {
  if (invitation.aceptada_en) return 'aceptada';
  if (invitation.revocada_en) return 'revocada';
  if (new Date(invitation.vence_en).getTime() <= now) return 'vencida';
  return 'pendiente';
}
export const invitationLabels: Record<InvitationState, string> = {
  aceptada: 'Aceptada',
  revocada: 'Revocada',
  vencida: 'Vencida',
  pendiente: 'Por aceptar',
};
export function shortDate(value: string, zone = 'America/Lima') {
  return new Intl.DateTimeFormat('es-PE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: zone,
  }).format(new Date(value));
}

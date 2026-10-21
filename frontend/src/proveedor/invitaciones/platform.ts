import type { PlatformInvitation } from './types';
export const platformPath = '/plataforma/invitaciones-negocio';
export type InvitationState = 'aceptada' | 'revocada' | 'vencida' | 'pendiente';
export function invitationState(invitation: PlatformInvitation, now = Date.now()): InvitationState {
  if (invitation.aceptada_en) return 'aceptada';
  if (invitation.revocada_en) return 'revocada';
  if (new Date(invitation.vence_en).getTime() <= now) return 'vencida';
  return 'pendiente';
}
export const invitationLabels: Record<InvitationState, string> = {
  aceptada: 'Alta completada',
  revocada: 'Revocada',
  vencida: 'Vencida',
  pendiente: 'Por aceptar',
};
export function platformSummary(invitations: PlatformInvitation[], now = Date.now()) {
  return {
    total: invitations.length,
    accepted: invitations.filter((i) => invitationState(i, now) === 'aceptada').length,
    pending: invitations.filter((i) => invitationState(i, now) === 'pendiente').length,
    mailErrors: invitations.filter(
      (i) => invitationState(i, now) === 'pendiente' && i.estado_envio === 'error',
    ).length,
  };
}
export function shortDate(value: string) {
  return new Intl.DateTimeFormat('es-PE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'America/Lima',
  }).format(new Date(value));
}

import type { PlatformInvitation } from './types';
import {
  invitationState,
  invitationLabels as sharedLabels,
} from '../../compartido/invitaciones/status';
export { invitationState, shortDate } from '../../compartido/invitaciones/status';
export type { InvitationState } from '../../compartido/invitaciones/status';
export const platformPath = '/plataforma/invitaciones-negocio';
export const invitationLabels = { ...sharedLabels, aceptada: 'Alta completada' };
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

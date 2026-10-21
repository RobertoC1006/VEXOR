import type { ManagedInvitation } from '../../compartido/invitaciones/types';
export interface PlatformInvitation extends ManagedInvitation {
  tipo: 'alta_negocio';
  negocio_nombre: string;
}

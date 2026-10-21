import { expect, it } from 'vitest';
import { invitationState, platformSummary } from './platform';
import type { PlatformInvitation } from './types';
const now = Date.parse('2026-10-20T12:00:00Z');
const invitation = (patch: Partial<PlatformInvitation> = {}): PlatformInvitation => ({
  id: 'test',
  tipo: 'alta_negocio',
  negocio_id: null,
  email: 'demo@example.test',
  nombre: 'Demo',
  negocio_nombre: 'Demo',
  creado_en: '2026-10-19T12:00:00Z',
  vence_en: '2026-10-27T12:00:00Z',
  revocada_en: null,
  aceptada_en: null,
  estado_envio: 'enviado',
  intentos: 1,
  error_codigo: null,
  ...patch,
});
it('un alta aceptada no vuelve a figurar pendiente aunque su correo haya fallado o su plazo terminara', () => {
  const item = invitation({
    aceptada_en: '2026-10-19T14:00:00Z',
    estado_envio: 'error',
    vence_en: '2026-10-20T11:00:00Z',
  });
  expect(invitationState(item, now)).toBe('aceptada');
  expect(platformSummary([item], now)).toEqual({
    total: 1,
    accepted: 1,
    pending: 0,
    mailErrors: 0,
  });
});
it('los revocados y vencidos no inflan la carga pendiente ni los correos por revisar', () => {
  const items = [
    invitation(),
    invitation({ estado_envio: 'error' }),
    invitation({ vence_en: '2026-10-20T12:00:00Z', estado_envio: 'error' }),
    invitation({ revocada_en: '2026-10-19T13:00:00Z', estado_envio: 'error' }),
  ];
  expect(platformSummary(items, now)).toEqual({ total: 4, accepted: 0, pending: 2, mailErrors: 1 });
});

export interface ManagedInvitation {
  id: string;
  tipo: 'alta_negocio' | 'miembro';
  negocio_id: string | null;
  email: string;
  nombre: string;
  negocio_nombre: string | null;
  creado_en: string;
  vence_en: string;
  revocada_en: string | null;
  aceptada_en: string | null;
  estado_envio: 'pendiente' | 'enviando' | 'enviado' | 'error';
  intentos: number;
  error_codigo: string | null;
}

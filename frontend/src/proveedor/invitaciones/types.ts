export interface PlatformInvitation {
  id: string;
  tipo: 'alta_negocio';
  negocio_id: string | null;
  email: string;
  nombre: string;
  negocio_nombre: string;
  creado_en: string;
  vence_en: string;
  revocada_en: string | null;
  aceptada_en: string | null;
  estado_envio: 'pendiente' | 'enviando' | 'enviado' | 'error';
  intentos: number;
  error_codigo: string | null;
}

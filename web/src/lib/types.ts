export interface Page<T> {
  items: T[];
  limit: number;
  offset: number;
}
export interface Me {
  auth_user_id: string;
  email: string;
  perfil: { id: string; nombre: string; activo: boolean } | null;
  administrador_plataforma: boolean;
}
export interface Business {
  negocio_id: string;
  nombre: string;
  miembro_id: string;
  es_propietario: boolean;
  zona_horaria: string;
}
export interface Invitation {
  id: string;
  tipo: string;
  negocio_nombre: string;
  nombre: string;
  vence_en: string;
}
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
export interface BusinessDetail {
  id: string;
  nombre: string;
  zona_horaria: string;
  activo: boolean;
}
export interface Local {
  id: string;
  nombre: string;
  activo: boolean;
  habilitado_venta: boolean;
  acciones: { codigo: string; permitido: boolean }[];
}
export interface Access {
  miembro_id: string;
  es_propietario: boolean;
  acciones: { codigo: string; alcance: string; permitido: boolean | null }[];
  locales: Local[];
  limit: number;
  offset: number;
}

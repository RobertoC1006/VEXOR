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

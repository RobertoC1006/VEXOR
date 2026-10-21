export interface Member {
  id: string;
  usuario_id: string;
  nombre: string;
  es_propietario: boolean;
  activo: boolean;
  creado_en: string;
}
export interface Role {
  id: string;
  nombre: string;
  activo: boolean;
  actualizado_en?: string;
}
export interface Permission {
  codigo: string;
  alcance: 'negocio' | 'local';
  descripcion: string;
}
export interface MemberRole {
  id: string;
  rol_id: string;
  local_id: string | null;
}
export interface IndividualPermission {
  id: string;
  permiso_codigo: string;
  efecto: 'permitir' | 'denegar';
  local_id: string | null;
  inicia_en: string;
  vence_en: string | null;
  revocado_en: string | null;
  motivo: string | null;
}

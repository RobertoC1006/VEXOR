export interface BusinessDetail {
  id: string;
  nombre: string;
  rubro: string | null;
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

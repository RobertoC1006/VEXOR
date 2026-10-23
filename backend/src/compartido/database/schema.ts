import type { ColumnType, Generated, JSONColumnType } from 'kysely';

type Timestamp = ColumnType<Date, Date | string | undefined, Date | string>;
type NullableTimestamp = ColumnType<
  Date | null,
  Date | string | null | undefined,
  Date | string | null
>;
interface Dated {
  creado_en: Timestamp;
  actualizado_en: Timestamp;
}
interface Negocio extends Dated {
  id: Generated<string>;
  nombre: string;
  activo: Generated<boolean>;
  zona_horaria: Generated<string>;
  rubro: Generated<string | null>;
  version: Generated<string>;
}
interface Local extends Dated {
  id: Generated<string>;
  negocio_id: string;
  nombre: string;
  mercado: Generated<string | null>;
  pabellon: Generated<string | null>;
  numero_puesto: Generated<string | null>;
  referencia: Generated<string | null>;
  habilitado_venta: Generated<boolean>;
  activo: Generated<boolean>;
}
interface Usuario extends Dated {
  id: Generated<string>;
  auth_user_id: string;
  nombre: string;
  activo: Generated<boolean>;
}
interface Miembro extends Dated {
  id: Generated<string>;
  negocio_id: string;
  usuario_id: string;
  es_propietario: Generated<boolean>;
  activo: Generated<boolean>;
}
interface Rol extends Dated {
  id: Generated<string>;
  negocio_id: string;
  nombre: string;
  activo: Generated<boolean>;
}
interface Permiso {
  codigo: string;
  alcance: 'negocio' | 'local';
  descripcion: string;
}
interface RolPermiso {
  negocio_id: string;
  rol_id: string;
  permiso_codigo: string;
  creado_en: Timestamp;
}
interface MiembroRol {
  id: Generated<string>;
  negocio_id: string;
  miembro_id: string;
  rol_id: string;
  local_id: string | null;
  creado_en: Timestamp;
}
interface MiembroLocal {
  negocio_id: string;
  miembro_id: string;
  local_id: string;
  creado_en: Timestamp;
}
interface PermisoIndividual extends Dated {
  id: Generated<string>;
  negocio_id: string;
  miembro_id: string;
  permiso_codigo: string;
  efecto: 'permitir' | 'denegar';
  local_id: string | null;
  otorgante_id: string;
  motivo: string | null;
  inicia_en: Timestamp;
  vence_en: NullableTimestamp;
  revocado_en: NullableTimestamp;
}
interface Auditoria {
  id: Generated<string>;
  negocio_id: string;
  actor_auth_id: string | null;
  actor_sql: string;
  tabla: string;
  operacion: string;
  anterior: JSONColumnType<Record<string, unknown>> | null;
  nuevo: JSONColumnType<Record<string, unknown>> | null;
  ocurrido_en: Timestamp;
}
type Money = ColumnType<string | null, string | null | undefined, string | null>;
interface Producto extends Dated {
  foto_version: Generated<number>;
  categoria_id: Generated<string | null>;
  ejes_variantes: Generated<string[]>;
  nivel_registro: Generated<'simple' | 'intermedio' | 'avanzado'>;
  caracteristicas: ColumnType<{ nombre: string; valor: string }[], string | undefined, string>;
  producto_padre_id: Generated<string | null>;
  id: Generated<string>;
  negocio_id: string;
  nombre: string;
  alias: Generated<string | null>;
  descripcion: Generated<string | null>;
  codigo: Generated<string | null>;
  precio: Money;
  costo: Money;
  activo: Generated<boolean>;
  version: Generated<number>;
}
interface InventarioInicial extends Dated {
  negocio_id: string;
  local_id: string;
  producto_id: string;
  cantidad: number;
  referencia: Generated<string | null>;
  estado: Generated<'preparacion' | 'confirmado'>;
  version: Generated<number>;
  confirmado_en: NullableTimestamp;
  confirmado_por: Generated<string | null>;
}
export interface Database {
  'app.negocio_perfil': {
    onboarding_paso: Generated<number>;
    negocio_id: string;
    descripcion: Generated<string | null>;
    foto: Generated<string | null>;
    preferencias: JSONColumnType<Record<string, unknown>>;
  };
  'app.stock_minimos': {
    negocio_id: string;
    local_id: string;
    producto_id: string;
    minimo: number | null;
    version: Generated<number>;
  };
  'app.productos_fotos': { negocio_id: string; producto_id: string; imagen: string };
  'app.categorias': {
    ejes_variantes: Generated<string[]>;
    id: Generated<string>;
    negocio_id: string;
    nombre: string;
    padre_id: Generated<string | null>;
    version: Generated<number>;
    creado_en: Timestamp;
    actualizado_en: Timestamp;
  };
  'app.productos': Producto;
  'app.inventario_inicial': InventarioInicial;
  'app.negocios': Negocio;
  'app.locales': Local;
  'app.usuarios': Usuario;
  'app.miembros_negocio': Miembro;
  'app.roles': Rol;
  'app.permisos': Permiso;
  'app.roles_permisos': RolPermiso;
  'app.miembros_roles': MiembroRol;
  'app.miembros_locales': MiembroLocal;
  'app.permisos_otorgados': PermisoIndividual;
  'app.auditoria_acceso': Auditoria;
}

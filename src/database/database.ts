import { Kysely, PostgresDialect, sql, type Transaction, type ColumnType, type Generated } from 'kysely';
import pg from 'pg';

type Timestamp = ColumnType<Date, Date | string | undefined, Date | string>;
interface Negocio {
  id: Generated<string>; nombre: string; activo: Generated<boolean>;
  zona_horaria: Generated<string>; version: Generated<string>;
  creado_en: Timestamp; actualizado_en: Timestamp;
}
interface Local {
  id: Generated<string>; negocio_id: string; nombre: string;
  habilitado_venta: Generated<boolean>; activo: Generated<boolean>;
  creado_en: Timestamp; actualizado_en: Timestamp;
}
export interface Database {
  'app.negocios': Negocio;
  'app.locales': Local;
}

export function createDatabase(connectionString: string, maxConnections = 5): Kysely<Database> {
  return new Kysely<Database>({
    dialect: new PostgresDialect({ pool: new pg.Pool({ connectionString, max: maxConnections }) }),
  });
}

export interface TenantContext {
  /** Supabase Auth sub, obtenido de un JWT validado por NestJS; nunca del cuerpo. */
  authUserId: string;
  /** Selección solicitada; la membresía se vuelve a comprobar en PostgreSQL. */
  negocioId: string;
}

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function withTenant<T>(
  db: Kysely<Database>, context: TenantContext,
  work: (tx: Transaction<Database>) => Promise<T>,
): Promise<T> {
  if (!uuid.test(context.authUserId) || !uuid.test(context.negocioId)) throw new Error('Contexto UUID inválido');
  return db.transaction().execute(async tx => {
    // La cuenta de conexión debe ser NOSUPERUSER NOBYPASSRLS y miembro únicamente
    // del rol vexor_runtime. Las credenciales de migración no sirven para tráfico.
    const role = await sql<{ rolsuper: boolean; rolbypassrls: boolean; rolcreaterole: boolean; rolcreatedb: boolean; rolreplication: boolean }>`
      select rolsuper, rolbypassrls, rolcreaterole, rolcreatedb, rolreplication from pg_roles where rolname = session_user
    `.execute(tx);
    if (!role.rows[0] || Object.values(role.rows[0]).some(Boolean)) throw new Error('Cuenta de conexión privilegiada rechazada');
    await sql`set local role vexor_runtime`.execute(tx);
    await sql`select set_config('vexor.actor_id', ${context.authUserId}, true),
      set_config('vexor.negocio_id', ${context.negocioId}, true)`.execute(tx);
    const member = await sql<{ miembro_id: string | null }>`select app_private.miembro_actual() as miembro_id`.execute(tx);
    if (!member.rows[0]?.miembro_id) throw new Error('Sin membresía activa en el negocio');
    return work(tx);
  });
}

export async function requirePermission(tx: Transaction<Database>, permission: string, localId?: string): Promise<void> {
  const result = await sql<{ permitido: boolean }>`select app_private.puede(${permission}, ${localId ?? null}::uuid) as permitido`.execute(tx);
  if (!result.rows[0]?.permitido) throw new Error('Permiso insuficiente');
}

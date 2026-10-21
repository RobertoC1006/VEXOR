import { Kysely, PostgresDialect, sql, type Transaction } from 'kysely';
import pg from 'pg';
import type { Database } from './schema.js';
export type { Database } from './schema.js';

export function secureDatabaseUrl(value: string): string {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error('DATABASE_URL inválida');
  }
  if (!['postgres:', 'postgresql:'].includes(parsed.protocol))
    throw new Error('DATABASE_URL inválida');
  // Conservar la configuración ya instalada en Render y en entornos locales.
  if (parsed.searchParams.get('sslrootcert') === 'supabase/certs/prod-ca-2021.crt') {
    parsed.searchParams.set('sslrootcert', 'backend/supabase/certs/prod-ca-2021.crt');
  }
  if (!['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname)) {
    const mode = parsed.searchParams.get('sslmode');
    if (mode && mode !== 'verify-full')
      throw new Error('La conexión PostgreSQL remota requiere sslmode=verify-full');
    parsed.searchParams.set('sslmode', 'verify-full');
  }
  return parsed.toString();
}

export function createDatabase(connectionString: string, maxConnections = 5): Kysely<Database> {
  return new Kysely<Database>({
    dialect: new PostgresDialect({
      pool: new pg.Pool({
        connectionString: secureDatabaseUrl(connectionString),
        max: maxConnections,
        connectionTimeoutMillis: 5000,
        idleTimeoutMillis: 30000,
        statement_timeout: 10000,
        idle_in_transaction_session_timeout: 15000,
        application_name: 'vexor-backend',
      }),
    }),
  });
}

export interface TenantContext {
  /** Supabase Auth sub, obtenido de un JWT validado por NestJS; nunca del cuerpo. */
  authUserId: string;
  /** Selección solicitada; la membresía se vuelve a comprobar en PostgreSQL. */
  negocioId: string;
  email?: string;
}

export class AccessDeniedError extends Error {}
export class UnsafeConnectionError extends Error {}

export async function assertRuntimeConnection(connection: Kysely<Database>) {
  const role = await sql<
    Record<string, boolean>
  >`select rolsuper,rolbypassrls,rolcreaterole,rolcreatedb,rolreplication,rolinherit,
    not exists(select 1 from pg_auth_members m join pg_roles r on r.oid=m.roleid
      where m.member=(select oid from pg_roles where rolname=session_user) and r.rolname='vexor_runtime' and m.set_option and not m.admin_option) as falta_runtime,
    exists(select 1 from pg_auth_members m join pg_roles r on r.oid=m.roleid
      where m.member=(select oid from pg_roles where rolname=session_user) and r.rolname<>'vexor_runtime') as membresia_adicional
    from pg_roles where rolname=session_user`.execute(connection);
  if (!role.rows[0] || Object.values(role.rows[0]).some(Boolean))
    throw new UnsafeConnectionError('Cuenta de conexión privilegiada rechazada');
}

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function withTenant<T>(
  db: Kysely<Database>,
  context: TenantContext,
  work: (tx: Transaction<Database>) => Promise<T>,
): Promise<T> {
  if (!uuid.test(context.negocioId)) throw new Error('Contexto UUID inválido');
  return withActor(
    db,
    context,
    async (tx) => {
      const member = await sql<{
        miembro_id: string | null;
      }>`select app_private.miembro_actual() as miembro_id`.execute(tx);
      if (!member.rows[0]?.miembro_id)
        throw new AccessDeniedError('Sin membresía activa en el negocio');
      return work(tx);
    },
    context.negocioId,
  );
}

export async function withActor<T>(
  db: Kysely<Database>,
  actor: { authUserId: string; email?: string },
  work: (tx: Transaction<Database>) => Promise<T>,
  negocioId = '',
): Promise<T> {
  if (!uuid.test(actor.authUserId)) throw new Error('Contexto UUID inválido');
  return db.transaction().execute(async (tx) => {
    // La cuenta de conexión debe ser NOSUPERUSER NOBYPASSRLS y miembro únicamente
    // del rol vexor_runtime. Las credenciales de migración no sirven para tráfico.
    await assertRuntimeConnection(tx);
    await sql`set local role vexor_runtime`.execute(tx);
    await sql`select set_config('vexor.actor_id', ${actor.authUserId}, true),
      set_config('vexor.actor_email', ${actor.email ?? ''}, true),
      set_config('vexor.negocio_id', ${negocioId}, true)`.execute(tx);
    return work(tx);
  });
}

export async function requirePermission(
  tx: Transaction<Database>,
  permission: string,
  localId?: string,
): Promise<void> {
  const result = await sql<{
    permitido: boolean;
  }>`select app_private.puede(${permission}, ${localId ?? null}::uuid) as permitido`.execute(tx);
  if (!result.rows[0]?.permitido) throw new AccessDeniedError('Permiso insuficiente');
}

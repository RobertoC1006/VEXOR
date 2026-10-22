import { sql, type Transaction } from 'kysely';
import { requireLocalAccess } from '../../compartido/autorizacion/authorization.js';
import { requirePermission, type Database } from '../../compartido/database/database.js';
export async function requireInventoryLocal(
  tx: Transaction<Database>,
  negocioId: string,
  localId: string,
) {
  await requireLocalAccess(tx, localId);
  await tx
    .selectFrom('app.locales')
    .select('id')
    .where('negocio_id', '=', negocioId)
    .where('id', '=', localId)
    .where('activo', '=', true)
    .executeTakeFirstOrThrow();
}
export async function inventoryRights(tx: Transaction<Database>, localId: string) {
  const rights = (
    await sql<{ ver: boolean; contar: boolean; confirmar: boolean }>`select
    app_private.puede('inventario.ver', ${localId}::uuid) as ver,
    app_private.puede('inventario.contar', ${localId}::uuid) as contar,
    app_private.puede('inventario.confirmar', ${localId}::uuid) as confirmar`.execute(tx)
  ).rows[0];
  if (!rights.ver && !rights.contar && !rights.confirmar)
    await requirePermission(tx, 'inventario.ver', localId);
  return rights;
}

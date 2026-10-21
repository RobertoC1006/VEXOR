import { Injectable } from '@nestjs/common';
import { sql, type Transaction } from 'kysely';
import { DatabaseService, type Actor } from '../../compartido/database/database.service.js';
import { requirePermission, type Database } from '../../compartido/database/database.js';
import { requireLocalAccess, requireOwner } from '../../compartido/autorizacion/authorization.js';
import { requirePatch } from '../../compartido/http/input.js';
import { page } from '../../compartido/http/pagination.js';
import type { LocalCreateDto, LocalPatchDto } from './dto.js';
import type { PaginationDto } from '../../compartido/http/pagination.dto.js';
@Injectable()
export class LocalsService {
  constructor(private readonly database: DatabaseService) {}
  locals(actor: Actor, negocioId: string, p: PaginationDto) {
    return this.database.tenant(actor, negocioId, async (tx) =>
      page(
        await this.localQuery(tx, negocioId)
          .orderBy('nombre')
          .orderBy('id')
          .limit(p.limit + 1)
          .offset(p.offset)
          .execute(),
        p,
      ),
    );
  }
  private localQuery(tx: Transaction<Database>, negocioId: string) {
    return tx.selectFrom('app.locales').selectAll().where('negocio_id', '=', negocioId);
  }
  local(actor: Actor, negocioId: string, localId: string) {
    return this.database.tenant(actor, negocioId, async (tx) => {
      const member = await requireLocalAccess(tx, localId);
      if (
        !member.es_propietario &&
        !(
          await sql<{ ok: boolean }>`select app_private.puede('locales.gestionar') as ok`.execute(
            tx,
          )
        ).rows[0].ok
      ) {
        await requirePermission(tx, 'locales.ver', localId);
      }
      return this.localQuery(tx, negocioId).where('id', '=', localId).executeTakeFirstOrThrow();
    });
  }
  createLocal(actor: Actor, negocioId: string, data: LocalCreateDto) {
    return this.database.tenant(actor, negocioId, async (tx) => {
      await requireOwner(tx);
      return tx
        .insertInto('app.locales')
        .values({ ...data, negocio_id: negocioId })
        .returningAll()
        .executeTakeFirstOrThrow();
    });
  }
  patchLocal(actor: Actor, negocioId: string, localId: string, data: LocalPatchDto) {
    requirePatch(data);
    return this.database.tenant(actor, negocioId, async (tx) => {
      await requirePermission(tx, 'locales.gestionar');
      await requireLocalAccess(tx, localId);
      return tx
        .updateTable('app.locales')
        .set(data)
        .where('negocio_id', '=', negocioId)
        .where('id', '=', localId)
        .returningAll()
        .executeTakeFirstOrThrow();
    });
  }
}

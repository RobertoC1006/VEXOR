import { Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import { DatabaseService, type Actor } from '../database/database.service.js';

import { page } from '../http/pagination.js';
import type { PaginationDto } from '../http/pagination.dto.js';
@Injectable()
export class MeService {
  constructor(private readonly database: DatabaseService) {}
  me(actor: Actor) {
    return this.database.actor(actor, async (tx) => ({
      auth_user_id: actor.authUserId,
      email: actor.email,
      perfil:
        (await tx
          .selectFrom('app.usuarios')
          .select(['id', 'nombre', 'activo'])
          .where('auth_user_id', '=', actor.authUserId)
          .executeTakeFirst()) ?? null,
      administrador_plataforma: (
        await sql<{ ok: boolean }>`select app_private.es_admin_plataforma() as ok`.execute(tx)
      ).rows[0].ok,
    }));
  }
  profile(actor: Actor, nombre: string) {
    return this.database.actor(actor, (tx) =>
      tx
        .updateTable('app.usuarios')
        .set({ nombre })
        .where('auth_user_id', '=', actor.authUserId)
        .returning(['id', 'nombre'])
        .executeTakeFirstOrThrow(),
    );
  }
  businesses(actor: Actor, p: PaginationDto) {
    return this.database.actor(actor, async (tx) =>
      page(
        (
          await sql<{
            negocio_id: string;
            nombre: string;
            miembro_id: string;
            es_propietario: boolean;
            zona_horaria: string;
          }>`
      select * from app_private.mis_negocios() order by nombre,negocio_id limit ${p.limit + 1} offset ${p.offset}`.execute(
            tx,
          )
        ).rows,
        p,
      ),
    );
  }
}

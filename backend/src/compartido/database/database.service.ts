import { Inject, Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { sql, type Kysely, type Transaction } from 'kysely';
import { CONFIG, type AppConfig } from '../config.js';
import {
  createDatabase,
  withActor,
  withTenant,
  assertRuntimeConnection,
  type Database,
} from './database.js';

export interface Actor {
  authUserId: string;
  email: string;
}
@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  readonly db: Kysely<Database>;
  constructor(@Inject(CONFIG) config: AppConfig) {
    this.db = createDatabase(config.databaseUrl, config.databasePoolMax);
  }
  actor<T>(actor: Actor, work: (tx: Transaction<Database>) => Promise<T>) {
    return withActor(this.db, actor, work);
  }
  tenant<T>(actor: Actor, negocioId: string, work: (tx: Transaction<Database>) => Promise<T>) {
    return withTenant(this.db, { ...actor, negocioId }, work);
  }
  async onModuleInit() {
    await assertRuntimeConnection(this.db);
    const schema = await withActor(
      this.db,
      { authUserId: '00000000-0000-0000-0000-000000000000' },
      (tx) =>
        sql<{
          ok: boolean;
        }>`select to_regprocedure('app_private.mis_negocios()') is not null as ok`.execute(tx),
    );
    if (!schema.rows[0]?.ok) throw new Error('Faltan migraciones del backend');
  }
  async onModuleDestroy() {
    await this.db.destroy();
  }
}

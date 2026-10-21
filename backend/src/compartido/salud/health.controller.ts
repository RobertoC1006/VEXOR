import { Controller, Get } from '@nestjs/common';
import { Public } from '../autenticacion/auth.guard.js';
import { DatabaseService } from '../database/database.service.js';
import { sql } from 'kysely';
@Controller('health')
export class HealthController {
  constructor(private readonly database: DatabaseService) {}
  @Get() @Public() health() {
    const revision = process.env.RENDER_GIT_COMMIT;
    return {
      status: 'ok',
      revision: revision && /^[a-f0-9]{40}$/.test(revision) ? revision : null,
    };
  }
  @Get('ready') @Public() async ready() {
    await sql`select 1`.execute(this.database.db);
    return { status: 'ready' };
  }
}

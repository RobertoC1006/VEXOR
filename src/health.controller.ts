import { Controller, Get } from '@nestjs/common';
import { Public } from './auth/auth.guard.js';
import { DatabaseService } from './database/database.service.js';
import { sql } from 'kysely';
@Controller('health')
export class HealthController {
  constructor(private readonly database:DatabaseService) {}
  @Get() @Public() health() {return {status:'ok'};}
  @Get('ready') @Public() async ready() {
    await sql`select 1`.execute(this.database.db);return {status:'ready'};
  }
}

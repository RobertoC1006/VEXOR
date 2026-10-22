import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentActor } from '../../compartido/autenticacion/actor.decorator.js';
import type { Actor } from '../../compartido/database/database.service.js';
import { BusinessId } from '../../compartido/http/resource-params.js';
import { SummaryService } from './resumen.service.js';
@ApiTags('Resumen del negocio')
@ApiBearerAuth()
@Controller('negocios/:negocioId/resumen')
export class SummaryController {
  constructor(private readonly summary: SummaryService) {}
  @Get() get(@CurrentActor() a: Actor, @BusinessId() n: string) {
    return this.summary.summary(a, n);
  }
}

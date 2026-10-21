import { Body, Controller, Get, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentActor } from '../../compartido/autenticacion/actor.decorator.js';
import type { Actor } from '../../compartido/database/database.service.js';
import { BusinessService } from './negocio.service.js';

import { BusinessPatchDto } from './dto.js';
import { PaginationDto } from '../../compartido/http/pagination.dto.js';
import { BusinessId } from '../../compartido/http/resource-params.js';
@ApiTags('Núcleo del negocio')
@ApiBearerAuth()
@Controller('negocios/:negocioId')
export class BusinessController {
  constructor(private readonly core: BusinessService) {}
  @Get() business(@CurrentActor() a: Actor, @BusinessId() n: string) {
    return this.core.business(a, n);
  }
  @Patch() patchBusiness(
    @CurrentActor() a: Actor,
    @BusinessId() n: string,
    @Body() d: BusinessPatchDto,
  ) {
    return this.core.patchBusiness(a, n, d);
  }
  @Get('acceso') access(
    @CurrentActor() a: Actor,
    @BusinessId() n: string,
    @Query() p: PaginationDto,
  ) {
    return this.core.access(a, n, p);
  }
}

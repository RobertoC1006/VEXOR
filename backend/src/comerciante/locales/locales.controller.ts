import { Body, Controller, Get, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentActor } from '../../compartido/autenticacion/actor.decorator.js';
import type { Actor } from '../../compartido/database/database.service.js';
import { LocalsService } from './locales.service.js';

import { LocalCreateDto, LocalPatchDto } from './dto.js';
import { PaginationDto } from '../../compartido/http/pagination.dto.js';
import { BusinessId, ResourceId } from '../../compartido/http/resource-params.js';
@ApiTags('Núcleo del negocio')
@ApiBearerAuth()
@Controller('negocios/:negocioId')
export class LocalsController {
  constructor(private readonly core: LocalsService) {}
  @Get('locales') locals(
    @CurrentActor() a: Actor,
    @BusinessId() n: string,
    @Query() p: PaginationDto,
  ) {
    return this.core.locals(a, n, p);
  }
  @Get('locales/:id') local(
    @CurrentActor() a: Actor,
    @BusinessId() n: string,
    @ResourceId() id: string,
  ) {
    return this.core.local(a, n, id);
  }
  @Post('locales') createLocal(
    @CurrentActor() a: Actor,
    @BusinessId() n: string,
    @Body() d: LocalCreateDto,
  ) {
    return this.core.createLocal(a, n, d);
  }
  @Patch('locales/:id') patchLocal(
    @CurrentActor() a: Actor,
    @BusinessId() n: string,
    @ResourceId() id: string,
    @Body() d: LocalPatchDto,
  ) {
    return this.core.patchLocal(a, n, id, d);
  }
}

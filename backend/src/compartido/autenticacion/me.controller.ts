import { Body, Controller, Get, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentActor } from './actor.decorator.js';
import type { Actor } from '../database/database.service.js';
import { MeService } from './me.service.js';

import { PaginationDto } from '../http/pagination.dto.js';
import { ProfilePatchDto } from './profile.dto.js';

@ApiTags('Identidad')
@ApiBearerAuth()
@Controller('me')
export class MeController {
  constructor(private readonly identity: MeService) {}
  @Get() me(@CurrentActor() actor: Actor) {
    return this.identity.me(actor);
  }
  @Patch() profile(@CurrentActor() actor: Actor, @Body() data: ProfilePatchDto) {
    return this.identity.profile(actor, data.nombre);
  }
  @Get('negocios') businesses(@CurrentActor() actor: Actor, @Query() p: PaginationDto) {
    return this.identity.businesses(actor, p);
  }
}

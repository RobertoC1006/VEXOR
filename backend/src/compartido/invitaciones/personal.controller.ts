import { Controller, Get, HttpCode, Post, Query } from '@nestjs/common';

import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentActor } from '../autenticacion/actor.decorator.js';
import type { Actor } from '../database/database.service.js';
import { PaginationDto } from '../http/pagination.dto.js';
import { InvitationsService } from './invitations.service.js';
import { Id } from '../http/invitation-params.js';
@ApiTags('Invitaciones personales')
@ApiBearerAuth()
@Controller('me/invitaciones')
export class PersonalInvitationsController {
  constructor(private readonly invitations: InvitationsService) {}
  @Get() mine(@CurrentActor() a: Actor, @Query() p: PaginationDto) {
    return this.invitations.mine(a, p);
  }
  @Post(':id/aceptar') @HttpCode(200) accept(@CurrentActor() a: Actor, @Id() id: string) {
    return this.invitations.accept(a, id);
  }
}

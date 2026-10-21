import { Body, Controller, Get, HttpCode, Post, Query } from '@nestjs/common';

import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentActor } from '../../compartido/autenticacion/actor.decorator.js';
import type { Actor } from '../../compartido/database/database.service.js';
import { BusinessInvitationDto } from './dto.js';
import { PaginationDto } from '../../compartido/http/pagination.dto.js';
import { InvitationsService } from '../../compartido/invitaciones/invitations.service.js';
import { Id, Idempotency, IdempotencyDoc } from '../../compartido/http/invitation-params.js';
@ApiTags('Administración de VEXOR')
@ApiBearerAuth()
@Controller('plataforma/invitaciones-negocio')
export class PlatformInvitationsController {
  constructor(private readonly invitations: InvitationsService) {}
  @Get() list(@CurrentActor() a: Actor, @Query() p: PaginationDto) {
    return this.invitations.list(a, undefined, p);
  }
  @Post() @HttpCode(202) @IdempotencyDoc() create(
    @CurrentActor() a: Actor,
    @Idempotency() id: string,
    @Body() d: BusinessInvitationDto,
  ) {
    return this.invitations.create(a, undefined, id, d);
  }
  @Post(':id/reenviar') @HttpCode(202) resend(@CurrentActor() a: Actor, @Id() id: string) {
    return this.invitations.dispatch(a, undefined, id);
  }
  @Post(':id/revocar') @HttpCode(200) revoke(@CurrentActor() a: Actor, @Id() id: string) {
    return this.invitations.revoke(a, undefined, id);
  }
}

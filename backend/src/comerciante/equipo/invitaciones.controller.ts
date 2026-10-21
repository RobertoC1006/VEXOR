import { Body, Controller, Get, HttpCode, Post, Query } from '@nestjs/common';

import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentActor } from '../../compartido/autenticacion/actor.decorator.js';
import type { Actor } from '../../compartido/database/database.service.js';
import { InvitationDto } from '../../compartido/invitaciones/dto.js';
import { PaginationDto } from '../../compartido/http/pagination.dto.js';
import { InvitationsService } from '../../compartido/invitaciones/invitations.service.js';
import {
  Id,
  BusinessId,
  Idempotency,
  IdempotencyDoc,
} from '../../compartido/http/invitation-params.js';
@ApiTags('Invitaciones del equipo')
@ApiBearerAuth()
@Controller('negocios/:negocioId/invitaciones')
export class BusinessInvitationsController {
  constructor(private readonly invitations: InvitationsService) {}
  @Get() list(@CurrentActor() a: Actor, @BusinessId() n: string, @Query() p: PaginationDto) {
    return this.invitations.list(a, n, p);
  }
  @Post() @HttpCode(202) @IdempotencyDoc() create(
    @CurrentActor() a: Actor,
    @BusinessId() n: string,
    @Idempotency() id: string,
    @Body() d: InvitationDto,
  ) {
    return this.invitations.create(a, n, id, d);
  }
  @Post(':id/reenviar') @HttpCode(202) resend(
    @CurrentActor() a: Actor,
    @BusinessId() n: string,
    @Id() id: string,
  ) {
    return this.invitations.dispatch(a, n, id);
  }
  @Post(':id/revocar') @HttpCode(200) revoke(
    @CurrentActor() a: Actor,
    @BusinessId() n: string,
    @Id() id: string,
  ) {
    return this.invitations.revoke(a, n, id);
  }
}

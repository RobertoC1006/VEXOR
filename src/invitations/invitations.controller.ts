import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query, createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { CurrentActor } from '../auth/actor.decorator.js';
import type { Actor } from '../database/database.service.js';
import { BusinessInvitationDto, InvitationDto, PaginationDto } from '../core/dto.js';
import { InvitationsService } from './invitations.service.js';

const Id=()=>Param('id',new ParseUUIDPipe());
const BusinessId=()=>Param('negocioId',new ParseUUIDPipe());
const IdempotencyParam=createParamDecorator((_data:unknown,ctx:ExecutionContext)=>ctx.switchToHttp().getRequest<Request>().headers['idempotency-key']);
const Idempotency=()=>IdempotencyParam(undefined,new ParseUUIDPipe());
const IdempotencyDoc=()=>ApiHeader({name:'Idempotency-Key',required:true,schema:{type:'string',format:'uuid'},description:'UUID estable para reintentar la misma solicitud'});

@ApiTags('Invitaciones personales') @ApiBearerAuth() @Controller('me/invitaciones')
export class PersonalInvitationsController {
  constructor(private readonly invitations:InvitationsService) {}
  @Get() mine(@CurrentActor() a:Actor,@Query() p:PaginationDto) {return this.invitations.mine(a,p);}
  @Post(':id/aceptar') @HttpCode(200) accept(@CurrentActor() a:Actor,@Id() id:string) {return this.invitations.accept(a,id);}
}

@ApiTags('Invitaciones del equipo') @ApiBearerAuth() @Controller('negocios/:negocioId/invitaciones')
export class BusinessInvitationsController {
  constructor(private readonly invitations:InvitationsService) {}
  @Get() list(@CurrentActor() a:Actor,@BusinessId() n:string,@Query() p:PaginationDto) {return this.invitations.list(a,n,p);}
  @Post() @HttpCode(202) @IdempotencyDoc() create(@CurrentActor() a:Actor,@BusinessId() n:string,@Idempotency() id:string,@Body() d:InvitationDto) {return this.invitations.create(a,n,id,d);}
  @Post(':id/reenviar') @HttpCode(202) resend(@CurrentActor() a:Actor,@BusinessId() n:string,@Id() id:string) {return this.invitations.dispatch(a,n,id);}
  @Post(':id/revocar') @HttpCode(200) revoke(@CurrentActor() a:Actor,@BusinessId() n:string,@Id() id:string) {return this.invitations.revoke(a,n,id);}
}

@ApiTags('Administración de VEXOR') @ApiBearerAuth() @Controller('plataforma/invitaciones-negocio')
export class PlatformInvitationsController {
  constructor(private readonly invitations:InvitationsService) {}
  @Get() list(@CurrentActor() a:Actor,@Query() p:PaginationDto) {return this.invitations.list(a,undefined,p);}
  @Post() @HttpCode(202) @IdempotencyDoc() create(@CurrentActor() a:Actor,@Idempotency() id:string,@Body() d:BusinessInvitationDto) {return this.invitations.create(a,undefined,id,d);}
  @Post(':id/reenviar') @HttpCode(202) resend(@CurrentActor() a:Actor,@Id() id:string) {return this.invitations.dispatch(a,undefined,id);}
  @Post(':id/revocar') @HttpCode(200) revoke(@CurrentActor() a:Actor,@Id() id:string) {return this.invitations.revoke(a,undefined,id);}
}

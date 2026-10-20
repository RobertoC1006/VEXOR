import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentActor } from '../auth/actor.decorator.js';
import type { Actor } from '../database/database.service.js';
import { CoreService } from './core.service.js';
import { BusinessPatchDto, IndividualPermissionDto, IndividualPermissionPatchDto, LocalCreateDto, LocalPatchDto, MemberLocalsDto, MemberPatchDto, MemberRoleDto, PaginationDto, ProfilePatchDto, RoleCreateDto, RolePatchDto, RolePermissionsDto } from './dto.js';

const BusinessId=()=>Param('negocioId',new ParseUUIDPipe());
const MemberId=()=>Param('miembroId',new ParseUUIDPipe());
const ResourceId=()=>Param('id',new ParseUUIDPipe());

@ApiTags('Identidad') @ApiBearerAuth() @Controller('me')
export class MeController {
  constructor(private readonly core:CoreService) {}
  @Get() me(@CurrentActor() actor:Actor) {return this.core.me(actor);}
  @Patch() profile(@CurrentActor() actor:Actor,@Body() data:ProfilePatchDto) {return this.core.profile(actor,data.nombre);}
  @Get('negocios') businesses(@CurrentActor() actor:Actor,@Query() p:PaginationDto) {return this.core.businesses(actor,p);}
}

@ApiTags('Núcleo del negocio') @ApiBearerAuth() @Controller('negocios/:negocioId')
export class CoreController {
  constructor(private readonly core:CoreService) {}
  @Get() business(@CurrentActor() a:Actor,@BusinessId() n:string) {return this.core.business(a,n);}
  @Patch() patchBusiness(@CurrentActor() a:Actor,@BusinessId() n:string,@Body() d:BusinessPatchDto) {return this.core.patchBusiness(a,n,d);}
  @Get('acceso') access(@CurrentActor() a:Actor,@BusinessId() n:string,@Query() p:PaginationDto) {return this.core.access(a,n,p);}
  @Get('locales') locals(@CurrentActor() a:Actor,@BusinessId() n:string,@Query() p:PaginationDto) {return this.core.locals(a,n,p);}
  @Post('locales') createLocal(@CurrentActor() a:Actor,@BusinessId() n:string,@Body() d:LocalCreateDto) {return this.core.createLocal(a,n,d);}
  @Patch('locales/:id') patchLocal(@CurrentActor() a:Actor,@BusinessId() n:string,@ResourceId() id:string,@Body() d:LocalPatchDto) {return this.core.patchLocal(a,n,id,d);}
  @Get('miembros') members(@CurrentActor() a:Actor,@BusinessId() n:string,@Query() p:PaginationDto) {return this.core.members(a,n,p);}
  @Patch('miembros/:miembroId') patchMember(@CurrentActor() a:Actor,@BusinessId() n:string,@MemberId() id:string,@Body() d:MemberPatchDto) {return this.core.patchMember(a,n,id,d);}
  @Get('roles') roles(@CurrentActor() a:Actor,@BusinessId() n:string,@Query() p:PaginationDto) {return this.core.roles(a,n,p);}
  @Post('roles') createRole(@CurrentActor() a:Actor,@BusinessId() n:string,@Body() d:RoleCreateDto) {return this.core.createRole(a,n,d);}
  @Patch('roles/:id') patchRole(@CurrentActor() a:Actor,@BusinessId() n:string,@ResourceId() id:string,@Body() d:RolePatchDto) {return this.core.patchRole(a,n,id,d);}
  @Get('roles/:id/permisos') rolePermissions(@CurrentActor() a:Actor,@BusinessId() n:string,@ResourceId() id:string) {return this.core.rolePermissions(a,n,id);}
  @Put('roles/:id/permisos') setRolePermissions(@CurrentActor() a:Actor,@BusinessId() n:string,@ResourceId() id:string,@Body() d:RolePermissionsDto) {return this.core.rolePermissions(a,n,id,d.permisos);}
  @Get('miembros/:miembroId/roles') memberRoles(@CurrentActor() a:Actor,@BusinessId() n:string,@MemberId() id:string,@Query() p:PaginationDto) {return this.core.memberRoles(a,n,id,p);}
  @Post('miembros/:miembroId/roles') addMemberRole(@CurrentActor() a:Actor,@BusinessId() n:string,@MemberId() id:string,@Body() d:MemberRoleDto) {return this.core.addMemberRole(a,n,id,d);}
  @Delete('miembros/:miembroId/roles/:id') removeMemberRole(@CurrentActor() a:Actor,@BusinessId() n:string,@MemberId() m:string,@ResourceId() id:string) {return this.core.removeMemberRole(a,n,m,id);}
  @Get('miembros/:miembroId/locales') memberLocals(@CurrentActor() a:Actor,@BusinessId() n:string,@MemberId() id:string,@Query() p:PaginationDto) {return this.core.memberLocals(a,n,id,p);}
  @Put('miembros/:miembroId/locales') setMemberLocals(@CurrentActor() a:Actor,@BusinessId() n:string,@MemberId() id:string,@Body() d:MemberLocalsDto,@Query() p:PaginationDto) {return this.core.memberLocals(a,n,id,p,d.locales_ids);}
  @Get('permisos') permissions(@CurrentActor() a:Actor,@BusinessId() n:string) {return this.core.permissions(a,n);}
  @Get('miembros/:miembroId/permisos') individualPermissions(@CurrentActor() a:Actor,@BusinessId() n:string,@MemberId() id:string,@Query() p:PaginationDto) {return this.core.individualPermissions(a,n,id,p);}
  @Post('miembros/:miembroId/permisos') grantPermission(@CurrentActor() a:Actor,@BusinessId() n:string,@MemberId() id:string,@Body() d:IndividualPermissionDto) {return this.core.grantPermission(a,n,id,d);}
  @Patch('miembros/:miembroId/permisos/:id') patchPermission(@CurrentActor() a:Actor,@BusinessId() n:string,@MemberId() m:string,@ResourceId() id:string,@Body() d:IndividualPermissionPatchDto) {return this.core.patchPermission(a,n,m,id,d);}
  @Post('miembros/:miembroId/permisos/:id/revocar') @HttpCode(200) revokePermission(@CurrentActor() a:Actor,@BusinessId() n:string,@MemberId() m:string,@ResourceId() id:string) {return this.core.revokePermission(a,n,m,id);}
  @Get('auditoria') audit(@CurrentActor() a:Actor,@BusinessId() n:string,@Query() p:PaginationDto) {return this.core.audit(a,n,p);}
}

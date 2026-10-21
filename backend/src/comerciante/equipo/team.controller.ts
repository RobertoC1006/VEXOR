import { Body, Controller, Delete, Get, HttpCode, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentActor } from '../../compartido/autenticacion/actor.decorator.js';
import type { Actor } from '../../compartido/database/database.service.js';

import { TeamService } from './team.service.js';
import {
  IndividualPermissionDto,
  IndividualPermissionPatchDto,
  MemberLocalsDto,
  MemberPatchDto,
  MemberRoleDto,
  RoleCreateDto,
  RolePatchDto,
  RolePermissionsDto,
} from './dto.js';
import { PaginationDto } from '../../compartido/http/pagination.dto.js';
import { BusinessId, MemberId, ResourceId } from '../../compartido/http/resource-params.js';
@ApiTags('Núcleo del negocio')
@ApiBearerAuth()
@Controller('negocios/:negocioId')
export class TeamController {
  constructor(private readonly team: TeamService) {}
  @Get('miembros') members(
    @CurrentActor() a: Actor,
    @BusinessId() n: string,
    @Query() p: PaginationDto,
  ) {
    return this.team.members(a, n, p);
  }
  @Get('miembros/:miembroId') member(
    @CurrentActor() a: Actor,
    @BusinessId() n: string,
    @MemberId() id: string,
  ) {
    return this.team.member(a, n, id);
  }
  @Patch('miembros/:miembroId') patchMember(
    @CurrentActor() a: Actor,
    @BusinessId() n: string,
    @MemberId() id: string,
    @Body() d: MemberPatchDto,
  ) {
    return this.team.patchMember(a, n, id, d);
  }
  @Get('roles') roles(
    @CurrentActor() a: Actor,
    @BusinessId() n: string,
    @Query() p: PaginationDto,
  ) {
    return this.team.roles(a, n, p);
  }
  @Get('roles/:id') role(
    @CurrentActor() a: Actor,
    @BusinessId() n: string,
    @ResourceId() id: string,
  ) {
    return this.team.role(a, n, id);
  }
  @Post('roles') createRole(
    @CurrentActor() a: Actor,
    @BusinessId() n: string,
    @Body() d: RoleCreateDto,
  ) {
    return this.team.createRole(a, n, d);
  }
  @Patch('roles/:id') patchRole(
    @CurrentActor() a: Actor,
    @BusinessId() n: string,
    @ResourceId() id: string,
    @Body() d: RolePatchDto,
  ) {
    return this.team.patchRole(a, n, id, d);
  }
  @Get('roles/:id/permisos') rolePermissions(
    @CurrentActor() a: Actor,
    @BusinessId() n: string,
    @ResourceId() id: string,
  ) {
    return this.team.rolePermissions(a, n, id);
  }
  @Put('roles/:id/permisos') setRolePermissions(
    @CurrentActor() a: Actor,
    @BusinessId() n: string,
    @ResourceId() id: string,
    @Body() d: RolePermissionsDto,
  ) {
    return this.team.rolePermissions(a, n, id, d.permisos);
  }
  @Get('miembros/:miembroId/roles') memberRoles(
    @CurrentActor() a: Actor,
    @BusinessId() n: string,
    @MemberId() id: string,
    @Query() p: PaginationDto,
  ) {
    return this.team.memberRoles(a, n, id, p);
  }
  @Post('miembros/:miembroId/roles') addMemberRole(
    @CurrentActor() a: Actor,
    @BusinessId() n: string,
    @MemberId() id: string,
    @Body() d: MemberRoleDto,
  ) {
    return this.team.addMemberRole(a, n, id, d);
  }
  @Delete('miembros/:miembroId/roles/:id') removeMemberRole(
    @CurrentActor() a: Actor,
    @BusinessId() n: string,
    @MemberId() m: string,
    @ResourceId() id: string,
  ) {
    return this.team.removeMemberRole(a, n, m, id);
  }
  @Get('miembros/:miembroId/locales') memberLocals(
    @CurrentActor() a: Actor,
    @BusinessId() n: string,
    @MemberId() id: string,
    @Query() p: PaginationDto,
  ) {
    return this.team.memberLocals(a, n, id, p);
  }
  @Put('miembros/:miembroId/locales') setMemberLocals(
    @CurrentActor() a: Actor,
    @BusinessId() n: string,
    @MemberId() id: string,
    @Body() d: MemberLocalsDto,
    @Query() p: PaginationDto,
  ) {
    return this.team.memberLocals(a, n, id, p, d.locales_ids);
  }
  @Get('permisos') permissions(@CurrentActor() a: Actor, @BusinessId() n: string) {
    return this.team.permissions(a, n);
  }
  @Get('miembros/:miembroId/permisos') individualPermissions(
    @CurrentActor() a: Actor,
    @BusinessId() n: string,
    @MemberId() id: string,
    @Query() p: PaginationDto,
  ) {
    return this.team.individualPermissions(a, n, id, p);
  }
  @Post('miembros/:miembroId/permisos') grantPermission(
    @CurrentActor() a: Actor,
    @BusinessId() n: string,
    @MemberId() id: string,
    @Body() d: IndividualPermissionDto,
  ) {
    return this.team.grantPermission(a, n, id, d);
  }
  @Patch('miembros/:miembroId/permisos/:id') patchPermission(
    @CurrentActor() a: Actor,
    @BusinessId() n: string,
    @MemberId() m: string,
    @ResourceId() id: string,
    @Body() d: IndividualPermissionPatchDto,
  ) {
    return this.team.patchPermission(a, n, m, id, d);
  }
  @Post('miembros/:miembroId/permisos/:id/revocar') @HttpCode(200) revokePermission(
    @CurrentActor() a: Actor,
    @BusinessId() n: string,
    @MemberId() m: string,
    @ResourceId() id: string,
  ) {
    return this.team.revokePermission(a, n, m, id);
  }
  @Get('auditoria') audit(
    @CurrentActor() a: Actor,
    @BusinessId() n: string,
    @Query() p: PaginationDto,
  ) {
    return this.team.audit(a, n, p);
  }
}

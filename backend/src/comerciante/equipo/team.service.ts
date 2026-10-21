import { Injectable } from '@nestjs/common';
import { sql, type Transaction } from 'kysely';
import { DatabaseService, type Actor } from '../../compartido/database/database.service.js';
import { requirePermission, type Database } from '../../compartido/database/database.js';
import { requireMemberAccess, requireOwner } from '../../compartido/autorizacion/authorization.js';
import { requirePatch } from '../../compartido/http/input.js';
import { page } from '../../compartido/http/pagination.js';
import type {
  IndividualPermissionDto,
  IndividualPermissionPatchDto,
  MemberPatchDto,
  MemberRoleDto,
  RoleCreateDto,
  RolePatchDto,
} from './dto.js';
import type { PaginationDto } from '../../compartido/http/pagination.dto.js';

type Tx = Transaction<Database>;
@Injectable()
export class TeamService {
  constructor(private readonly database: DatabaseService) {}
  members(actor: Actor, negocioId: string, p: PaginationDto) {
    return this.database.tenant(actor, negocioId, async (tx) => {
      await requirePermission(tx, 'equipo.ver');
      return page(
        await this.memberQuery(tx, negocioId)
          .orderBy('u.nombre')
          .orderBy('m.id')
          .limit(p.limit + 1)
          .offset(p.offset)
          .execute(),
        p,
      );
    });
  }
  private memberQuery(tx: Tx, negocioId: string) {
    return tx
      .selectFrom('app.miembros_negocio as m')
      .innerJoin('app.usuarios as u', 'u.id', 'm.usuario_id')
      .select(['m.id', 'm.usuario_id', 'm.es_propietario', 'm.activo', 'u.nombre', 'm.creado_en'])
      .where('m.negocio_id', '=', negocioId);
  }
  member(actor: Actor, negocioId: string, memberId: string) {
    return this.database.tenant(actor, negocioId, async (tx) => {
      await requireMemberAccess(tx, memberId);
      return this.memberQuery(tx, negocioId).where('m.id', '=', memberId).executeTakeFirstOrThrow();
    });
  }
  patchMember(actor: Actor, negocioId: string, memberId: string, data: MemberPatchDto) {
    requirePatch(data);
    return this.database.tenant(actor, negocioId, async (tx) => {
      await requireOwner(tx);
      return tx
        .updateTable('app.miembros_negocio')
        .set(data)
        .where('negocio_id', '=', negocioId)
        .where('id', '=', memberId)
        .returning(['id', 'usuario_id', 'es_propietario', 'activo'])
        .executeTakeFirstOrThrow();
    });
  }
  roles(actor: Actor, negocioId: string, p: PaginationDto) {
    return this.database.tenant(actor, negocioId, async (tx) => {
      await requirePermission(tx, 'equipo.ver');
      return page(
        await this.roleQuery(tx, negocioId)
          .orderBy('nombre')
          .orderBy('id')
          .limit(p.limit + 1)
          .offset(p.offset)
          .execute(),
        p,
      );
    });
  }
  private roleQuery(tx: Tx, negocioId: string) {
    return tx.selectFrom('app.roles').selectAll().where('negocio_id', '=', negocioId);
  }
  role(actor: Actor, negocioId: string, roleId: string) {
    return this.database.tenant(actor, negocioId, async (tx) => {
      await requirePermission(tx, 'equipo.ver');
      return this.roleQuery(tx, negocioId).where('id', '=', roleId).executeTakeFirstOrThrow();
    });
  }
  createRole(actor: Actor, negocioId: string, data: RoleCreateDto) {
    return this.database.tenant(actor, negocioId, async (tx) => {
      await requireOwner(tx);
      return tx
        .insertInto('app.roles')
        .values({ ...data, negocio_id: negocioId })
        .returningAll()
        .executeTakeFirstOrThrow();
    });
  }
  patchRole(actor: Actor, negocioId: string, roleId: string, data: RolePatchDto) {
    requirePatch(data);
    return this.database.tenant(actor, negocioId, async (tx) => {
      await requireOwner(tx);
      return tx
        .updateTable('app.roles')
        .set(data)
        .where('negocio_id', '=', negocioId)
        .where('id', '=', roleId)
        .returningAll()
        .executeTakeFirstOrThrow();
    });
  }
  rolePermissions(actor: Actor, negocioId: string, roleId: string, permissions?: string[]) {
    return this.database.tenant(actor, negocioId, async (tx) => {
      if (permissions) await requireOwner(tx);
      else await requirePermission(tx, 'equipo.ver');
      await this.roleQuery(tx, negocioId).where('id', '=', roleId).executeTakeFirstOrThrow();
      if (permissions) {
        await tx
          .deleteFrom('app.roles_permisos')
          .where('negocio_id', '=', negocioId)
          .where('rol_id', '=', roleId)
          .execute();
        if (permissions.length)
          await tx
            .insertInto('app.roles_permisos')
            .values(
              permissions.map((permiso_codigo) => ({
                negocio_id: negocioId,
                rol_id: roleId,
                permiso_codigo,
              })),
            )
            .execute();
      }
      return tx
        .selectFrom('app.roles_permisos')
        .select('permiso_codigo')
        .where('negocio_id', '=', negocioId)
        .where('rol_id', '=', roleId)
        .orderBy('permiso_codigo')
        .execute();
    });
  }
  private async memberExists(tx: Tx, negocioId: string, memberId: string) {
    await tx
      .selectFrom('app.miembros_negocio')
      .select('id')
      .where('negocio_id', '=', negocioId)
      .where('id', '=', memberId)
      .executeTakeFirstOrThrow();
  }
  memberRoles(actor: Actor, negocioId: string, memberId: string, p: PaginationDto) {
    return this.database.tenant(actor, negocioId, async (tx) => {
      await requireMemberAccess(tx, memberId);
      await this.memberExists(tx, negocioId, memberId);
      return page(
        await tx
          .selectFrom('app.miembros_roles')
          .selectAll()
          .where('negocio_id', '=', negocioId)
          .where('miembro_id', '=', memberId)
          .orderBy('id')
          .limit(p.limit + 1)
          .offset(p.offset)
          .execute(),
        p,
      );
    });
  }
  addMemberRole(actor: Actor, negocioId: string, memberId: string, data: MemberRoleDto) {
    return this.database.tenant(actor, negocioId, async (tx) => {
      await requireOwner(tx);
      await this.memberExists(tx, negocioId, memberId);
      return tx
        .insertInto('app.miembros_roles')
        .values({
          negocio_id: negocioId,
          miembro_id: memberId,
          rol_id: data.rol_id,
          local_id: data.local_id ?? null,
        })
        .returningAll()
        .executeTakeFirstOrThrow();
    });
  }
  removeMemberRole(actor: Actor, negocioId: string, memberId: string, assignmentId: string) {
    return this.database.tenant(actor, negocioId, async (tx) => {
      await requireOwner(tx);
      return tx
        .deleteFrom('app.miembros_roles')
        .where('negocio_id', '=', negocioId)
        .where('miembro_id', '=', memberId)
        .where('id', '=', assignmentId)
        .returning('id')
        .executeTakeFirstOrThrow();
    });
  }
  memberLocals(
    actor: Actor,
    negocioId: string,
    memberId: string,
    p: PaginationDto,
    locals?: string[],
  ) {
    return this.database.tenant(actor, negocioId, async (tx) => {
      if (locals) await requireOwner(tx);
      else await requireMemberAccess(tx, memberId);
      await this.memberExists(tx, negocioId, memberId);
      if (locals) {
        await tx
          .deleteFrom('app.miembros_locales')
          .where('negocio_id', '=', negocioId)
          .where('miembro_id', '=', memberId)
          .execute();
        if (locals.length)
          await tx
            .insertInto('app.miembros_locales')
            .values(
              locals.map((local_id) => ({ negocio_id: negocioId, miembro_id: memberId, local_id })),
            )
            .execute();
      }
      return page(
        await tx
          .selectFrom('app.miembros_locales')
          .select('local_id')
          .where('negocio_id', '=', negocioId)
          .where('miembro_id', '=', memberId)
          .orderBy('local_id')
          .limit(p.limit + 1)
          .offset(p.offset)
          .execute(),
        p,
      );
    });
  }
  permissions(actor: Actor, negocioId: string) {
    return this.database.tenant(actor, negocioId, (tx) =>
      tx.selectFrom('app.permisos').selectAll().orderBy('codigo').execute(),
    );
  }
  individualPermissions(actor: Actor, negocioId: string, memberId: string, p: PaginationDto) {
    return this.database.tenant(actor, negocioId, async (tx) => {
      await requireMemberAccess(tx, memberId);
      await this.memberExists(tx, negocioId, memberId);
      return page(
        await tx
          .selectFrom('app.permisos_otorgados')
          .selectAll()
          .where('negocio_id', '=', negocioId)
          .where('miembro_id', '=', memberId)
          .orderBy('creado_en', 'desc')
          .orderBy('id')
          .limit(p.limit + 1)
          .offset(p.offset)
          .execute(),
        p,
      );
    });
  }
  grantPermission(
    actor: Actor,
    negocioId: string,
    memberId: string,
    data: IndividualPermissionDto,
  ) {
    return this.database.tenant(actor, negocioId, async (tx) => {
      const author = (await requireOwner(tx)).miembro_id;
      await this.memberExists(tx, negocioId, memberId);
      return tx
        .insertInto('app.permisos_otorgados')
        .values({
          ...data,
          negocio_id: negocioId,
          miembro_id: memberId,
          otorgante_id: author,
          local_id: data.local_id ?? null,
          vence_en: data.vence_en ?? null,
          motivo: data.motivo ?? null,
        })
        .returningAll()
        .executeTakeFirstOrThrow();
    });
  }
  patchPermission(
    actor: Actor,
    negocioId: string,
    memberId: string,
    permissionId: string,
    data: IndividualPermissionPatchDto,
  ) {
    requirePatch(data);
    return this.database.tenant(actor, negocioId, async (tx) => {
      await requireOwner(tx);
      return tx
        .updateTable('app.permisos_otorgados')
        .set(data)
        .where('negocio_id', '=', negocioId)
        .where('miembro_id', '=', memberId)
        .where('id', '=', permissionId)
        .returningAll()
        .executeTakeFirstOrThrow();
    });
  }
  revokePermission(actor: Actor, negocioId: string, memberId: string, permissionId: string) {
    return this.database.tenant(actor, negocioId, async (tx) => {
      await requireOwner(tx);
      return tx
        .updateTable('app.permisos_otorgados')
        .set({ revocado_en: sql`coalesce(revocado_en,clock_timestamp())` })
        .where('negocio_id', '=', negocioId)
        .where('miembro_id', '=', memberId)
        .where('id', '=', permissionId)
        .returningAll()
        .executeTakeFirstOrThrow();
    });
  }
  audit(actor: Actor, negocioId: string, p: PaginationDto) {
    return this.database.tenant(actor, negocioId, async (tx) => {
      await requireOwner(tx);
      return page(
        await tx
          .selectFrom('app.auditoria_acceso')
          .select(['id', 'actor_auth_id', 'tabla', 'operacion', 'anterior', 'nuevo', 'ocurrido_en'])
          .where('negocio_id', '=', negocioId)
          .orderBy('ocurrido_en', 'desc')
          .orderBy('id')
          .limit(p.limit + 1)
          .offset(p.offset)
          .execute(),
        p,
      );
    });
  }
}

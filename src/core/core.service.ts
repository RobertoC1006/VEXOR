import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { sql, type Transaction } from 'kysely';
import { DatabaseService, type Actor } from '../database/database.service.js';
import { requirePermission, type Database } from '../database/database.js';
import type { BusinessPatchDto, IndividualPermissionDto, IndividualPermissionPatchDto, LocalCreateDto, LocalPatchDto, MemberPatchDto, MemberRoleDto, PaginationDto, RoleCreateDto, RolePatchDto } from './dto.js';

type Tx=Transaction<Database>;
export async function requireOwner(tx:Tx) {
  const result=await sql<{ok:boolean}>`select app_private.es_propietario() as ok`.execute(tx);
  if(!result.rows[0]?.ok) throw new ForbiddenException('Se requiere ser propietario del negocio');
}
const patch=(data:object)=>{if(!Object.keys(data).length) throw new BadRequestException('Indica al menos un campo para modificar');};
const page=<T>(items:T[],p:PaginationDto)=>({items,limit:p.limit,offset:p.offset});

@Injectable()
export class CoreService {
  constructor(private readonly database:DatabaseService) {}
  me(actor:Actor) {
    return this.database.actor(actor,async tx=>({auth_user_id:actor.authUserId,email:actor.email,
      perfil:await tx.selectFrom('app.usuarios').select(['id','nombre','activo']).where('auth_user_id','=',actor.authUserId).executeTakeFirst()??null,
      administrador_plataforma:(await sql<{ok:boolean}>`select app_private.es_admin_plataforma() as ok`.execute(tx)).rows[0].ok,
    }));
  }
  profile(actor:Actor,nombre:string) {
    return this.database.actor(actor,tx=>tx.updateTable('app.usuarios').set({nombre}).where('auth_user_id','=',actor.authUserId).returning(['id','nombre']).executeTakeFirstOrThrow());
  }
  businesses(actor:Actor,p:PaginationDto) {
    return this.database.actor(actor,async tx=>page((await sql<{negocio_id:string;nombre:string;miembro_id:string;es_propietario:boolean;zona_horaria:string}>`
      select * from app_private.mis_negocios() order by nombre,negocio_id limit ${p.limit} offset ${p.offset}`.execute(tx)).rows,p));
  }
  business(actor:Actor,negocioId:string) {
    return this.database.tenant(actor,negocioId,tx=>tx.selectFrom('app.negocios').select(['id','nombre','zona_horaria','activo']).where('id','=',negocioId).executeTakeFirstOrThrow());
  }
  patchBusiness(actor:Actor,negocioId:string,data:BusinessPatchDto) {
    patch(data);return this.database.tenant(actor,negocioId,async tx=>{
      await requirePermission(tx,'negocio.editar');
      return tx.updateTable('app.negocios').set(data).where('id','=',negocioId).returning(['id','nombre','zona_horaria']).executeTakeFirstOrThrow();
    });
  }
  access(actor:Actor,negocioId:string,p:PaginationDto) {
    return this.database.tenant(actor,negocioId,async tx=>{
      const member=(await sql<{miembro_id:string;es_propietario:boolean}>`select app_private.miembro_actual() as miembro_id,app_private.es_propietario() as es_propietario`.execute(tx)).rows[0];
      const actions=(await sql<{codigo:string;alcance:string;permitido:boolean|null}>`select codigo,alcance,
        case when alcance='negocio' then app_private.puede(codigo) else null end as permitido from app.permisos order by codigo`.execute(tx)).rows;
      const locals=await tx.selectFrom('app.locales').select(['id','nombre','activo','habilitado_venta']).where('negocio_id','=',negocioId).orderBy('id').limit(p.limit).offset(p.offset).execute();
      const localActions=(await sql<{local_id:string;codigo:string;permitido:boolean}>`select l.id as local_id,p.codigo,app_private.puede(p.codigo,l.id) as permitido
        from app.locales l cross join app.permisos p where p.alcance='local' and l.negocio_id=${negocioId}::uuid
        and l.id=any(${locals.map(l=>l.id)}::uuid[]) order by l.id,p.codigo`.execute(tx)).rows;
      return {...member,acciones:actions,locales:locals.map(l=>({...l,acciones:localActions.filter(a=>a.local_id===l.id).map(({codigo,permitido})=>({codigo,permitido}))})),limit:p.limit,offset:p.offset};
    });
  }
  locals(actor:Actor,negocioId:string,p:PaginationDto) {
    return this.database.tenant(actor,negocioId,async tx=>page(await tx.selectFrom('app.locales').selectAll().where('negocio_id','=',negocioId).orderBy('nombre').orderBy('id').limit(p.limit).offset(p.offset).execute(),p));
  }
  createLocal(actor:Actor,negocioId:string,data:LocalCreateDto) {
    return this.database.tenant(actor,negocioId,async tx=>{await requireOwner(tx);return tx.insertInto('app.locales').values({...data,negocio_id:negocioId}).returningAll().executeTakeFirstOrThrow();});
  }
  patchLocal(actor:Actor,negocioId:string,localId:string,data:LocalPatchDto) {
    patch(data);return this.database.tenant(actor,negocioId,async tx=>{
      await requirePermission(tx,'locales.gestionar');
      return tx.updateTable('app.locales').set(data).where('negocio_id','=',negocioId).where('id','=',localId).returningAll().executeTakeFirstOrThrow();
    });
  }
  members(actor:Actor,negocioId:string,p:PaginationDto) {
    return this.database.tenant(actor,negocioId,async tx=>{await requirePermission(tx,'equipo.ver');return page(await tx.selectFrom('app.miembros_negocio as m')
      .innerJoin('app.usuarios as u','u.id','m.usuario_id').select(['m.id','m.usuario_id','m.es_propietario','m.activo','u.nombre','m.creado_en'])
      .where('m.negocio_id','=',negocioId).orderBy('u.nombre').orderBy('m.id').limit(p.limit).offset(p.offset).execute(),p);});
  }
  patchMember(actor:Actor,negocioId:string,memberId:string,data:MemberPatchDto) {
    patch(data);return this.database.tenant(actor,negocioId,async tx=>{await requireOwner(tx);return tx.updateTable('app.miembros_negocio').set(data)
      .where('negocio_id','=',negocioId).where('id','=',memberId).returning(['id','usuario_id','es_propietario','activo']).executeTakeFirstOrThrow();});
  }
  roles(actor:Actor,negocioId:string,p:PaginationDto) {
    return this.database.tenant(actor,negocioId,async tx=>{await requirePermission(tx,'equipo.ver');return page(await tx.selectFrom('app.roles').selectAll()
      .where('negocio_id','=',negocioId).orderBy('nombre').orderBy('id').limit(p.limit).offset(p.offset).execute(),p);});
  }
  createRole(actor:Actor,negocioId:string,data:RoleCreateDto) {
    return this.database.tenant(actor,negocioId,async tx=>{await requireOwner(tx);return tx.insertInto('app.roles').values({...data,negocio_id:negocioId}).returningAll().executeTakeFirstOrThrow();});
  }
  patchRole(actor:Actor,negocioId:string,roleId:string,data:RolePatchDto) {
    patch(data);return this.database.tenant(actor,negocioId,async tx=>{await requireOwner(tx);return tx.updateTable('app.roles').set(data)
      .where('negocio_id','=',negocioId).where('id','=',roleId).returningAll().executeTakeFirstOrThrow();});
  }
  rolePermissions(actor:Actor,negocioId:string,roleId:string,permissions?:string[]) {
    return this.database.tenant(actor,negocioId,async tx=>{
      if(permissions) await requireOwner(tx);else await requirePermission(tx,'equipo.ver');
      await tx.selectFrom('app.roles').select('id').where('negocio_id','=',negocioId).where('id','=',roleId).executeTakeFirstOrThrow();
      if(permissions) {
        await tx.deleteFrom('app.roles_permisos').where('negocio_id','=',negocioId).where('rol_id','=',roleId).execute();
        if(permissions.length) await tx.insertInto('app.roles_permisos').values(permissions.map(permiso_codigo=>({negocio_id:negocioId,rol_id:roleId,permiso_codigo}))).execute();
      }
      return tx.selectFrom('app.roles_permisos').select('permiso_codigo').where('negocio_id','=',negocioId).where('rol_id','=',roleId).orderBy('permiso_codigo').execute();
    });
  }
  private async memberExists(tx:Tx,negocioId:string,memberId:string) {
    await tx.selectFrom('app.miembros_negocio').select('id').where('negocio_id','=',negocioId).where('id','=',memberId).executeTakeFirstOrThrow();
  }
  memberRoles(actor:Actor,negocioId:string,memberId:string,p:PaginationDto) {
    return this.database.tenant(actor,negocioId,async tx=>{await this.memberExists(tx,negocioId,memberId);return page(await tx.selectFrom('app.miembros_roles').selectAll().where('negocio_id','=',negocioId).where('miembro_id','=',memberId).orderBy('id').limit(p.limit).offset(p.offset).execute(),p);});
  }
  addMemberRole(actor:Actor,negocioId:string,memberId:string,data:MemberRoleDto) {
    return this.database.tenant(actor,negocioId,async tx=>{await requireOwner(tx);await this.memberExists(tx,negocioId,memberId);
      return tx.insertInto('app.miembros_roles').values({negocio_id:negocioId,miembro_id:memberId,rol_id:data.rol_id,local_id:data.local_id??null}).returningAll().executeTakeFirstOrThrow();});
  }
  removeMemberRole(actor:Actor,negocioId:string,memberId:string,assignmentId:string) {
    return this.database.tenant(actor,negocioId,async tx=>{await requireOwner(tx);return tx.deleteFrom('app.miembros_roles').where('negocio_id','=',negocioId)
      .where('miembro_id','=',memberId).where('id','=',assignmentId).returning('id').executeTakeFirstOrThrow();});
  }
  memberLocals(actor:Actor,negocioId:string,memberId:string,p:PaginationDto,locals?:string[]) {
    return this.database.tenant(actor,negocioId,async tx=>{
      if(locals) await requireOwner(tx);await this.memberExists(tx,negocioId,memberId);
      if(locals) {
        await tx.deleteFrom('app.miembros_locales').where('negocio_id','=',negocioId).where('miembro_id','=',memberId).execute();
        if(locals.length) await tx.insertInto('app.miembros_locales').values(locals.map(local_id=>({negocio_id:negocioId,miembro_id:memberId,local_id}))).execute();
      }
      return page(await tx.selectFrom('app.miembros_locales').select('local_id').where('negocio_id','=',negocioId).where('miembro_id','=',memberId).orderBy('local_id').limit(p.limit).offset(p.offset).execute(),p);
    });
  }
  permissions(actor:Actor,negocioId:string) {return this.database.tenant(actor,negocioId,tx=>tx.selectFrom('app.permisos').selectAll().orderBy('codigo').execute());}
  individualPermissions(actor:Actor,negocioId:string,memberId:string,p:PaginationDto) {
    return this.database.tenant(actor,negocioId,async tx=>{await this.memberExists(tx,negocioId,memberId);return page(await tx.selectFrom('app.permisos_otorgados').selectAll()
      .where('negocio_id','=',negocioId).where('miembro_id','=',memberId).orderBy('creado_en','desc').orderBy('id').limit(p.limit).offset(p.offset).execute(),p);});
  }
  grantPermission(actor:Actor,negocioId:string,memberId:string,data:IndividualPermissionDto) {
    return this.database.tenant(actor,negocioId,async tx=>{await requireOwner(tx);await this.memberExists(tx,negocioId,memberId);
      const author=(await sql<{id:string}>`select app_private.miembro_actual() as id`.execute(tx)).rows[0].id;
      return tx.insertInto('app.permisos_otorgados').values({...data,negocio_id:negocioId,miembro_id:memberId,otorgante_id:author,
        local_id:data.local_id??null,vence_en:data.vence_en??null,motivo:data.motivo??null}).returningAll().executeTakeFirstOrThrow();});
  }
  patchPermission(actor:Actor,negocioId:string,memberId:string,permissionId:string,data:IndividualPermissionPatchDto) {
    patch(data);return this.database.tenant(actor,negocioId,async tx=>{await requireOwner(tx);return tx.updateTable('app.permisos_otorgados').set(data)
      .where('negocio_id','=',negocioId).where('miembro_id','=',memberId).where('id','=',permissionId).returningAll().executeTakeFirstOrThrow();});
  }
  revokePermission(actor:Actor,negocioId:string,memberId:string,permissionId:string) {
    return this.database.tenant(actor,negocioId,async tx=>{await requireOwner(tx);return tx.updateTable('app.permisos_otorgados').set({revocado_en:sql`coalesce(revocado_en,clock_timestamp())`})
      .where('negocio_id','=',negocioId).where('miembro_id','=',memberId).where('id','=',permissionId).returningAll().executeTakeFirstOrThrow();});
  }
  audit(actor:Actor,negocioId:string,p:PaginationDto) {
    return this.database.tenant(actor,negocioId,async tx=>{await requireOwner(tx);return page(await tx.selectFrom('app.auditoria_acceso')
      .select(['id','actor_auth_id','tabla','operacion','anterior','nuevo','ocurrido_en']).where('negocio_id','=',negocioId).orderBy('ocurrido_en','desc').orderBy('id').limit(p.limit).offset(p.offset).execute(),p);});
  }
}

import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { sql, type Transaction } from 'kysely';
import { DatabaseService, type Actor } from '../database/database.service.js';
import type { Database } from '../database/database.js';
import { requireOwner } from '../core/core.service.js';
import type { BusinessInvitationDto, InvitationDto, PaginationDto } from '../core/dto.js';
import { InvitationMailService } from './mail.service.js';

export interface Invitation {id:string;tipo:string;negocio_id:string|null;email:string;nombre:string;negocio_nombre:string|null;
  creado_en:Date;vence_en:Date;revocada_en:Date|null;aceptada_en:Date|null;estado_envio:string;intentos:number;error_codigo:string|null}
@Injectable()
export class InvitationsService {
  constructor(private readonly database:DatabaseService,private readonly mail:InvitationMailService) {}
  private scope<T>(actor:Actor,negocioId:string|undefined,work:(tx:Transaction<Database>)=>Promise<T>) {
    if(negocioId) return this.database.tenant(actor,negocioId,async tx=>{await requireOwner(tx);return work(tx);});
    return this.database.actor(actor,async tx=>{
      const admin=(await sql<{ok:boolean}>`select app_private.es_admin_plataforma() as ok`.execute(tx)).rows[0]?.ok;
      if(!admin) throw new ForbiddenException('Se requiere administración de VEXOR');
      return work(tx);
    });
  }
  list(actor:Actor,negocioId:string|undefined,p:PaginationDto) {
    return this.scope(actor,negocioId,async tx=>({items:(await sql<Invitation>`select * from app_private.invitaciones_gestionables()
      order by creado_en desc,id limit ${p.limit} offset ${p.offset}`.execute(tx)).rows,limit:p.limit,offset:p.offset}));
  }
  private get(actor:Actor,negocioId:string|undefined,id:string) {
    return this.scope(actor,negocioId,async tx=>{
      const invitation=(await sql<Invitation>`select * from app_private.invitaciones_gestionables() where id=${id}::uuid`.execute(tx)).rows[0];
      if(!invitation) throw new NotFoundException('Invitación no encontrada');return invitation;
    });
  }
  async create(actor:Actor,negocioId:string|undefined,id:string,data:InvitationDto|BusinessInvitationDto) {
    const business='negocio_nombre' in data?data:null;
    await this.scope(actor,negocioId,async tx=>sql`select app_private.solicitar_invitacion(${id}::uuid,${negocioId??null}::uuid,
      ${data.email},${data.nombre},${business?.negocio_nombre??null},${business?.zona_horaria??null})`.execute(tx));
    const existing=await this.get(actor,negocioId,id);
    if(existing.aceptada_en || existing.revocada_en) return existing;
    return this.dispatch(actor,negocioId,id,false);
  }
  async dispatch(actor:Actor,negocioId:string|undefined,id:string,resend=true) {
    const claim=await this.scope(actor,negocioId,async tx=>(await sql<{email:string;lease:string}>`
      select * from app_private.reservar_envio(${id}::uuid,${resend})`.execute(tx)).rows[0]);
    if(claim) {
      const error=await this.mail.send(claim.email);
      await this.database.actor(actor,tx=>sql`select app_private.finalizar_envio(${id}::uuid,${claim.lease}::uuid,${error})`.execute(tx));
    }
    return this.get(actor,negocioId,id);
  }
  async revoke(actor:Actor,negocioId:string|undefined,id:string) {
    await this.scope(actor,negocioId,tx=>sql`select app_private.revocar_invitacion(${id}::uuid)`.execute(tx));
    return this.get(actor,negocioId,id);
  }
  mine(actor:Actor,p:PaginationDto) {
    return this.database.actor(actor,async tx=>({items:(await sql<{id:string;tipo:string;negocio_nombre:string;nombre:string;vence_en:Date}>`
      select * from app_private.mis_invitaciones() order by vence_en,id limit ${p.limit} offset ${p.offset}`.execute(tx)).rows,limit:p.limit,offset:p.offset}));
  }
  accept(actor:Actor,id:string) {
    return this.database.actor(actor,async tx=>(await sql<{negocio_id:string;miembro_id:string}>`select * from app_private.aceptar_invitacion(${id}::uuid)`.execute(tx)).rows[0]);
  }
}

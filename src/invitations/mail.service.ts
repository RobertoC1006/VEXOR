import { Inject, Injectable } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import { CONFIG, type AppConfig } from '../config.js';
import { authOptions } from '../auth/auth.service.js';

export type MailError='auth_temporal'|'auth_rechazada'|'auth_no_configurado';
@Injectable()
export class InvitationMailService {
  private readonly admin;
  constructor(@Inject(CONFIG) private readonly config:AppConfig) {
    this.admin=config.supabaseSecretKey?createClient(config.supabaseUrl,config.supabaseSecretKey,authOptions):null;
  }
  async send(email:string):Promise<MailError|null> {
    if(!this.admin || !this.config.invitationRedirectUrl) return 'auth_no_configurado';
    try {
      const invited=await this.admin.auth.admin.inviteUserByEmail(email,{redirectTo:this.config.invitationRedirectUrl});
      if(!invited.error) return null;
      // Una identidad puede trabajar en varios negocios. No se crea otra cuenta
      // ni se cambia su contraseña: recibe un enlace de acceso a su cuenta actual.
      if(['email_exists','user_already_exists'].includes(invited.error.code??'')) {
        const existing=await this.admin.auth.signInWithOtp({email,options:{shouldCreateUser:false,emailRedirectTo:this.config.invitationRedirectUrl}});
        if(!existing.error) return null;
        return (existing.error.status??0)>=500?'auth_temporal':'auth_rechazada';
      }
      return (invited.error.status??0)>=500 || invited.error.name==='AuthRetryableFetchError'?'auth_temporal':'auth_rechazada';
    } catch {return 'auth_temporal';}
  }
}

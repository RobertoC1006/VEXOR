import { Module, type DynamicModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { CONFIG, type AppConfig } from './config.js';
import { DatabaseService } from './database/database.service.js';
import { AuthService } from './auth/auth.service.js';
import { AuthGuard } from './auth/auth.guard.js';
import { CoreService } from './core/core.service.js';
import { CoreController, MeController } from './core/core.controller.js';
import { InvitationMailService } from './invitations/mail.service.js';
import { InvitationsService } from './invitations/invitations.service.js';
import { BusinessInvitationsController, PersonalInvitationsController, PlatformInvitationsController } from './invitations/invitations.controller.js';
import { HealthController } from './health.controller.js';

@Module({})
export class AppModule {
  static register(config:AppConfig):DynamicModule {
    return {module:AppModule,controllers:[HealthController,MeController,CoreController,PersonalInvitationsController,BusinessInvitationsController,PlatformInvitationsController],
      providers:[{provide:CONFIG,useValue:config},DatabaseService,AuthService,CoreService,InvitationMailService,InvitationsService,{provide:APP_GUARD,useClass:AuthGuard}]};
  }
}

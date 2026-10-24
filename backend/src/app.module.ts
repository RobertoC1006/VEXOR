import { CartsService } from './comerciante/ventas/carritos.service.js';
import { SalesController } from './comerciante/ventas/ventas.controller.js';
import { SalesService } from './comerciante/ventas/ventas.service.js';
import { MovementsController } from './comerciante/inventario/movimientos.controller.js';
import { MovementsService } from './comerciante/inventario/movimientos.service.js';
import { SummaryController } from './comerciante/inicio/resumen.controller.js';
import { SummaryService } from './comerciante/inicio/resumen.service.js';
import { Module, type DynamicModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { CONFIG, type AppConfig } from './compartido/config.js';
import { DatabaseService } from './compartido/database/database.service.js';
import { AuthService } from './compartido/autenticacion/auth.service.js';
import { AuthGuard } from './compartido/autenticacion/auth.guard.js';
import { BusinessService } from './comerciante/negocio/negocio.service.js';
import { MeService } from './compartido/autenticacion/me.service.js';
import { LocalsService } from './comerciante/locales/locales.service.js';
import { TeamService } from './comerciante/equipo/team.service.js';
import { BusinessController } from './comerciante/negocio/negocio.controller.js';
import { MeController } from './compartido/autenticacion/me.controller.js';
import { LocalsController } from './comerciante/locales/locales.controller.js';
import { TeamController } from './comerciante/equipo/team.controller.js';
import { InvitationMailService } from './compartido/invitaciones/mail.service.js';
import { InvitationsService } from './compartido/invitaciones/invitations.service.js';
import { BusinessInvitationsController } from './comerciante/equipo/invitaciones.controller.js';
import { PersonalInvitationsController } from './compartido/invitaciones/personal.controller.js';
import { PlatformInvitationsController } from './proveedor/invitaciones/invitaciones.controller.js';
import { HealthController } from './compartido/salud/health.controller.js';
import { ProductsController } from './comerciante/productos/productos.controller.js';
import { ProductsService } from './comerciante/productos/productos.service.js';
import { InventoryController } from './comerciante/inventario/inventario.controller.js';
import { InventoryService } from './comerciante/inventario/inventario.service.js';
import { CategoriesController, CategoriesService } from './comerciante/categorias/categorias.js';
import { ProductRegistrationService } from './comerciante/productos/registro.service.js';

@Module({})
export class AppModule {
  static register(config: AppConfig): DynamicModule {
    return {
      module: AppModule,
      controllers: [
        SalesController,
        SummaryController,
        HealthController,
        ProductsController,
        InventoryController,
        MovementsController,
        CategoriesController,
        MeController,
        BusinessController,
        LocalsController,
        TeamController,
        PersonalInvitationsController,
        BusinessInvitationsController,
        PlatformInvitationsController,
      ],
      providers: [
        CartsService,
        SalesService,
        { provide: CONFIG, useValue: config },
        SummaryService,
        DatabaseService,
        ProductsService,
        ProductRegistrationService,
        InventoryService,
        MovementsService,
        CategoriesService,
        AuthService,
        BusinessService,
        MeService,
        LocalsService,
        TeamService,
        InvitationMailService,
        InvitationsService,
        { provide: APP_GUARD, useClass: AuthGuard },
      ],
    };
  }
}

import { Body, Controller, Get, HttpCode, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentActor } from '../../compartido/autenticacion/actor.decorator.js';
import type { Actor } from '../../compartido/database/database.service.js';
import { BusinessId, ResourceId } from '../../compartido/http/resource-params.js';
import { InventoryService } from './inventario.service.js';
import { CountSaveDto, CountConfirmDto, InventoryQueryDto, MinimumSaveDto } from './dto.js';
import { Param, ParseUUIDPipe } from '@nestjs/common';

@ApiTags('Inventario inicial')
@ApiBearerAuth()
@Controller('negocios/:negocioId/locales/:localId/inventario')
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}
  @Get() list(
    @CurrentActor() a: Actor,
    @BusinessId() n: string,
    @Param('localId', new ParseUUIDPipe()) l: string,
    @Query() q: InventoryQueryDto,
  ) {
    return this.inventory.list(a, n, l, q);
  }
  @Put(':id/minimo') minimum(
    @CurrentActor() a: Actor,
    @BusinessId() n: string,
    @Param('localId', new ParseUUIDPipe()) l: string,
    @ResourceId() id: string,
    @Body() d: MinimumSaveDto,
  ) {
    return this.inventory.minimum(a, n, l, id, d);
  }
  @Put(':id/conteo') save(
    @CurrentActor() a: Actor,
    @BusinessId() n: string,
    @Param('localId', new ParseUUIDPipe()) l: string,
    @ResourceId() id: string,
    @Body() d: CountSaveDto,
  ) {
    return this.inventory.save(a, n, l, id, d);
  }
  @Post(':id/confirmar') @HttpCode(200) confirm(
    @CurrentActor() a: Actor,
    @BusinessId() n: string,
    @Param('localId', new ParseUUIDPipe()) l: string,
    @ResourceId() id: string,
    @Body() d: CountConfirmDto,
  ) {
    return this.inventory.confirm(a, n, l, id, d);
  }
}

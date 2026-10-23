import { Body, Controller, Get, Post, Query, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentActor } from '../../compartido/autenticacion/actor.decorator.js';
import type { Actor } from '../../compartido/database/database.service.js';
import { BusinessId, ResourceId } from '../../compartido/http/resource-params.js';
import { MovementsService } from './movimientos.service.js';
import { AdjustmentDto, TransferDto, ReceiptDto, MovementQueryDto } from './movimientos.dto.js';
@ApiTags('Existencias y movimientos')
@ApiBearerAuth()
@Controller('negocios/:negocioId')
export class MovementsController {
  constructor(private readonly service: MovementsService) {}
  @Get('inventario/productos/:id') detail(
    @CurrentActor() a: Actor,
    @BusinessId() n: string,
    @ResourceId() id: string,
  ) {
    return this.service.detail(a, n, id);
  }
  @Get('locales/:localId/movimientos') list(
    @CurrentActor() a: Actor,
    @BusinessId() n: string,
    @Param('localId', new ParseUUIDPipe()) l: string,
    @Query() q: MovementQueryDto,
  ) {
    return this.service.list(a, n, l, q);
  }
  @Get('locales/:localId/traslados') transfers(
    @CurrentActor() a: Actor,
    @BusinessId() n: string,
    @Param('localId', new ParseUUIDPipe()) l: string,
    @Query() q: MovementQueryDto,
  ) {
    return this.service.list(a, n, l, q, true);
  }
  @Post('locales/:localId/ajustes') adjust(
    @CurrentActor() a: Actor,
    @BusinessId() n: string,
    @Param('localId', new ParseUUIDPipe()) l: string,
    @Body() d: AdjustmentDto,
  ) {
    return this.service.write(a, n, l, 'ajuste', d);
  }
  @Post('locales/:localId/traslados') send(
    @CurrentActor() a: Actor,
    @BusinessId() n: string,
    @Param('localId', new ParseUUIDPipe()) l: string,
    @Body() d: TransferDto,
  ) {
    return this.service.write(a, n, l, 'salida', d);
  }
  @Post('locales/:localId/recepciones') receive(
    @CurrentActor() a: Actor,
    @BusinessId() n: string,
    @Param('localId', new ParseUUIDPipe()) l: string,
    @Body() d: ReceiptDto,
  ) {
    return this.service.write(a, n, l, 'recepcion', d);
  }
}

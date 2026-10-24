import { CartsService } from './carritos.service.js';
import { CartQueryDto, CartSaveDto, CartVersionDto } from './carritos.dto.js';
import { Body, Controller, Get, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentActor } from '../../compartido/autenticacion/actor.decorator.js';
import type { Actor } from '../../compartido/database/database.service.js';
import { BusinessId, ResourceId } from '../../compartido/http/resource-params.js';
import { PolicyDto, PosQueryDto, PresentationDto, SaleDto } from './dto.js';
import { SalesService } from './ventas.service.js';
@ApiTags('Ventas')
@ApiBearerAuth()
@Controller('negocios/:negocioId/ventas')
export class SalesController {
  constructor(
    private readonly sales: SalesService,
    private readonly carts: CartsService,
  ) {}
  @Get('carritos/:id') getCart(
    @CurrentActor() a: Actor,
    @BusinessId() n: string,
    @ResourceId() id: string,
  ) {
    return this.carts.get(a, n, id);
  }
  @Get('carritos') waiting(
    @CurrentActor() a: Actor,
    @BusinessId() n: string,
    @Query() q: CartQueryDto,
  ) {
    return this.carts.list(a, n, q);
  }
  @Put('carritos/:id') saveCart(
    @CurrentActor() a: Actor,
    @BusinessId() n: string,
    @ResourceId() id: string,
    @Body() d: CartSaveDto,
  ) {
    return this.carts.save(a, n, id, d);
  }
  @Post('carritos/:id/descartar') discardCart(
    @CurrentActor() a: Actor,
    @BusinessId() n: string,
    @ResourceId() id: string,
    @Body() d: CartVersionDto,
  ) {
    return this.carts.discard(a, n, id, d.version);
  }

  @Get('pos') setup(@CurrentActor() a: Actor, @BusinessId() n: string) {
    return this.sales.setup(a, n);
  }
  @Get('catalogo') catalog(
    @CurrentActor() a: Actor,
    @BusinessId() n: string,
    @Query() q: PosQueryDto,
  ) {
    return this.sales.catalog(a, n, q);
  }
  @Get() history(@CurrentActor() a: Actor, @BusinessId() n: string, @Query() q: PosQueryDto) {
    return this.sales.history(a, n, q);
  }
  @Post() charge(@CurrentActor() a: Actor, @BusinessId() n: string, @Body() d: SaleDto) {
    return this.sales.charge(a, n, d);
  }
  @Put('politica') policy(@CurrentActor() a: Actor, @BusinessId() n: string, @Body() d: PolicyDto) {
    return this.sales.policy(a, n, d);
  }
  @Post('presentaciones') presentation(
    @CurrentActor() a: Actor,
    @BusinessId() n: string,
    @Body() d: PresentationDto,
  ) {
    return this.sales.presentation(a, n, d);
  }
  @Put('presentaciones/:id') editPresentation(
    @CurrentActor() a: Actor,
    @BusinessId() n: string,
    @ResourceId() id: string,
    @Body() d: PresentationDto,
  ) {
    return this.sales.editPresentation(a, n, id, d);
  }
}

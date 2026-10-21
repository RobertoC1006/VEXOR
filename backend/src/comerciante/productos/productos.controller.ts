import { Body, Controller, Get, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentActor } from '../../compartido/autenticacion/actor.decorator.js';
import type { Actor } from '../../compartido/database/database.service.js';
import { BusinessId, ResourceId } from '../../compartido/http/resource-params.js';
import { ProductCreateDto, ProductPatchDto, ProductQueryDto } from './dto.js';
import { ProductsService } from './productos.service.js';

@ApiTags('Productos')
@ApiBearerAuth()
@Controller('negocios/:negocioId/productos')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}
  @Get(':id/variantes') variants(
    @CurrentActor() a: Actor,
    @BusinessId() n: string,
    @ResourceId() id: string,
    @Query() q: ProductQueryDto,
  ) {
    return this.products.list(a, n, q, id);
  }
  @Post(':id/variantes') createVariant(
    @CurrentActor() a: Actor,
    @BusinessId() n: string,
    @ResourceId() id: string,
    @Body() d: ProductCreateDto,
  ) {
    return this.products.create(a, n, d, id);
  }
  @Get() list(@CurrentActor() a: Actor, @BusinessId() n: string, @Query() q: ProductQueryDto) {
    return this.products.list(a, n, q);
  }
  @Get(':id') get(@CurrentActor() a: Actor, @BusinessId() n: string, @ResourceId() id: string) {
    return this.products.get(a, n, id);
  }
  @Post() create(@CurrentActor() a: Actor, @BusinessId() n: string, @Body() d: ProductCreateDto) {
    return this.products.create(a, n, d);
  }
  @Patch(':id') patch(
    @CurrentActor() a: Actor,
    @BusinessId() n: string,
    @ResourceId() id: string,
    @Body() d: ProductPatchDto,
  ) {
    return this.products.patch(a, n, id, d);
  }
}

import { Body, Controller, Get, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentActor } from '../../compartido/autenticacion/actor.decorator.js';
import type { Actor } from '../../compartido/database/database.service.js';
import { BusinessId, ResourceId } from '../../compartido/http/resource-params.js';
import { ProductCreateDto, ProductPatchDto, ProductQueryDto, RegistrationDto } from './dto.js';
import { ProductsService } from './productos.service.js';
import { ProductRegistrationService } from './registro.service.js';

@ApiTags('Productos')
@ApiBearerAuth()
@Controller('negocios/:negocioId/productos')
export class ProductsController {
  constructor(
    private readonly products: ProductsService,
    private readonly registration: ProductRegistrationService,
  ) {}
  @Post('registro') register(
    @CurrentActor() a: Actor,
    @BusinessId() n: string,
    @Body() d: RegistrationDto,
  ) {
    return this.registration.save(a, n, d);
  }
  @Put(':id/registro') registerChanges(
    @CurrentActor() a: Actor,
    @BusinessId() n: string,
    @ResourceId() id: string,
    @Body() d: RegistrationDto,
  ) {
    return this.registration.save(a, n, d, id);
  }
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
  @Get(':id/foto') photo(
    @CurrentActor() a: Actor,
    @BusinessId() n: string,
    @ResourceId() id: string,
  ) {
    return this.products.photo(a, n, id);
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

import {
  Body,
  ConflictException,
  Controller,
  Get,
  Injectable,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiProperty,
  ApiPropertyOptional,
  ApiTags,
  PartialType,
  PickType,
} from '@nestjs/swagger';
import { IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { DatabaseService, type Actor } from '../../compartido/database/database.service.js';
import { CurrentActor } from '../../compartido/autenticacion/actor.decorator.js';
import { BusinessId, ResourceId } from '../../compartido/http/resource-params.js';
import { PaginationDto } from '../../compartido/http/pagination.dto.js';
import { page } from '../../compartido/http/pagination.js';
import { requirePatch } from '../../compartido/http/input.js';
import { TrimmedText } from '../../compartido/http/validation.js';
import { requirePermission } from '../../compartido/database/database.js';
import { requireProductRead } from '../productos/productos.service.js';
import { ProductCreateDto } from '../productos/dto.js';

export class CategoryCreateDto extends PickType(ProductCreateDto, ['ejes_variantes'] as const) {
  @ApiProperty() @TrimmedText(120) nombre!: string;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsUUID() padre_id?: string | null;
}
export class CategoryPatchDto extends PartialType(CategoryCreateDto, {
  skipNullProperties: false,
}) {
  @ApiProperty() @IsInt() @Min(1) @Max(2147483647) version!: number;
}
@Injectable()
export class CategoriesService {
  constructor(private readonly database: DatabaseService) {}
  list(actor: Actor, negocioId: string, p: PaginationDto) {
    return this.database.tenant(actor, negocioId, async (tx) => {
      await requireProductRead(tx);
      return page(
        await tx
          .selectFrom('app.categorias')
          .selectAll()
          .where('negocio_id', '=', negocioId)
          .orderBy('nombre')
          .orderBy('id')
          .offset(p.offset)
          .limit(p.limit + 1)
          .execute(),
        p,
      );
    });
  }
  create(actor: Actor, negocioId: string, data: CategoryCreateDto) {
    return this.database.tenant(actor, negocioId, async (tx) => {
      await requirePermission(tx, 'productos.gestionar');
      return tx
        .insertInto('app.categorias')
        .values({ ...data, negocio_id: negocioId })
        .returningAll()
        .executeTakeFirstOrThrow();
    });
  }
  patch(actor: Actor, negocioId: string, id: string, data: CategoryPatchDto) {
    const { version, ...changes } = data;
    requirePatch(changes);
    return this.database.tenant(actor, negocioId, async (tx) => {
      await requirePermission(tx, 'productos.gestionar');
      const current = await tx
        .selectFrom('app.categorias')
        .select('version')
        .where('negocio_id', '=', negocioId)
        .where('id', '=', id)
        .forUpdate()
        .executeTakeFirstOrThrow();
      if (current.version !== version)
        throw new ConflictException('La categoría cambió; actualiza la lista');
      return tx
        .updateTable('app.categorias')
        .set(changes)
        .where('negocio_id', '=', negocioId)
        .where('id', '=', id)
        .returningAll()
        .executeTakeFirstOrThrow();
    });
  }
}
@ApiTags('Categorías')
@ApiBearerAuth()
@Controller('negocios/:negocioId/categorias')
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}
  @Get() list(@CurrentActor() a: Actor, @BusinessId() n: string, @Query() p: PaginationDto) {
    return this.categories.list(a, n, p);
  }
  @Post() create(@CurrentActor() a: Actor, @BusinessId() n: string, @Body() d: CategoryCreateDto) {
    return this.categories.create(a, n, d);
  }
  @Patch(':id') patch(
    @CurrentActor() a: Actor,
    @BusinessId() n: string,
    @ResourceId() id: string,
    @Body() d: CategoryPatchDto,
  ) {
    return this.categories.patch(a, n, id, d);
  }
}

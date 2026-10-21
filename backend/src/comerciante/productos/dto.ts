import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { NullableText, OptionalField, TrimmedText } from '../../compartido/http/validation.js';
import { PaginationDto } from '../../compartido/http/pagination.dto.js';

export class AttributeDto {
  @ApiProperty() @TrimmedText(40) nombre!: string;
  @ApiProperty() @TrimmedText(160) valor!: string;
}
export class ProductCreateDto {
  @ApiPropertyOptional({ enum: ['simple', 'intermedio', 'avanzado'] })
  @OptionalField()
  @IsIn(['simple', 'intermedio', 'avanzado'])
  nivel_registro?: 'simple' | 'intermedio' | 'avanzado';
  @ApiPropertyOptional({ type: [AttributeDto] })
  @OptionalField()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => AttributeDto)
  caracteristicas?: AttributeDto[];
  @ApiProperty() @TrimmedText(160) nombre!: string;
  @ApiPropertyOptional({ nullable: true }) @NullableText(160) alias?: string | null;
  @ApiPropertyOptional({ nullable: true }) @NullableText(1000) descripcion?: string | null;
  @ApiPropertyOptional({ nullable: true }) @NullableText(120) codigo?: string | null;
  // Importes decimales como texto: no convertir ausencias ni usar punto flotante.
  @ApiPropertyOptional({ nullable: true, example: '18.50' })
  @IsOptional()
  @IsString()
  @Matches(/^(?:0|[1-9]\d{0,11})(?:\.\d{1,2})?$/)
  precio?: string | null;
  @ApiPropertyOptional({ nullable: true, example: '12.00' })
  @IsOptional()
  @IsString()
  @Matches(/^(?:0|[1-9]\d{0,11})(?:\.\d{1,2})?$/)
  costo?: string | null;
  @ApiPropertyOptional() @OptionalField() @IsBoolean() activo?: boolean;
}
export class ProductPatchDto extends PartialType(ProductCreateDto, { skipNullProperties: false }) {
  @ApiProperty() @IsInt() @Min(1) @Max(2147483647) version!: number;
}
export class ProductQueryDto extends PaginationDto {
  @ApiPropertyOptional() @OptionalField() @TrimmedText(120) codigo?: string;
  @ApiPropertyOptional() @OptionalField() @TrimmedText(160) q?: string;
}

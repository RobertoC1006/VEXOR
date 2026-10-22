import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsUUID,
  ArrayUnique,
  Length,
  IsDefined,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
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
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(20000)
  @Matches(/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/)
  foto?: string | null;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsUUID() categoria_id?: string | null;
  @ApiPropertyOptional({ type: [String] })
  @OptionalField()
  @IsArray()
  @ArrayMaxSize(20)
  @ArrayUnique()
  @IsString({ each: true })
  @Length(1, 40, { each: true })
  ejes_variantes?: string[];
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
  @ApiPropertyOptional() @OptionalField() @IsUUID() local_id?: string;
  @ApiPropertyOptional() @OptionalField() @IsUUID() categoria_id?: string;
  @ApiPropertyOptional() @OptionalField() @TrimmedText(120) codigo?: string;
  @ApiPropertyOptional() @OptionalField() @TrimmedText(160) q?: string;
}
export class CombinationDto extends ProductCreateDto {
  @ApiPropertyOptional() @OptionalField() @IsUUID() id?: string;
  @ApiPropertyOptional() @OptionalField() @IsInt() @Min(1) @Max(2147483647) version?: number;
}
export class RegistrationDto {
  @ApiProperty({ type: ProductCreateDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => ProductCreateDto)
  producto!: ProductCreateDto;
  @ApiPropertyOptional() @OptionalField() @IsInt() @Min(1) @Max(2147483647) version?: number;
  @ApiProperty({ type: [CombinationDto] })
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => CombinationDto)
  combinaciones!: CombinationDto[];
}

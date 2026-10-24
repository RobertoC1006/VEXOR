import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDefined,
  IsInt,
  MaxLength,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { NullableText, TrimmedText } from '../../compartido/http/validation.js';
import { PaginationDto } from '../../compartido/http/pagination.dto.js';
const money = /^(?:0|[1-9]\d{0,11})(?:\.\d{1,2})?$/;
export class SaleLineDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() producto_id!: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() presentacion_id?: string;
  @ApiProperty({ minimum: 1, maximum: 1000000 }) @IsInt() @Min(1) @Max(1000000) cantidad!: number;
  @ApiProperty({ minimum: 1, maximum: 1000000 })
  @IsInt()
  @Min(1)
  @Max(1000000)
  unidades_esperadas!: number;
  @ApiProperty({ type: String, example: '18.00' })
  @IsString()
  @Matches(money)
  precio_esperado!: string;
}
export class PaymentsDto {
  @ApiProperty({ type: String, example: '18.00' }) @IsString() @Matches(money) efectivo!: string;
  @ApiProperty({ type: String, example: '18.00' }) @IsString() @Matches(money) yape!: string;
  @ApiProperty({ type: String, example: '18.00' }) @IsString() @Matches(money) plin!: string;
}
export class CartContentDto {
  @ApiProperty({ type: [SaleLineDto], minItems: 1, maxItems: 100 })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => SaleLineDto)
  lineas!: SaleLineDto[];
  @ApiProperty({ type: String, example: '18.00' }) @IsString() @Matches(money) descuento!: string;
}
export class SaleDto extends CartContentDto {
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() carrito_id?: string;
  @ApiPropertyOptional({ minimum: 1 }) @IsOptional() @IsInt() @Min(1) carrito_version?: number;
  @ApiProperty({ format: 'uuid' }) @IsUUID() operacion_id!: string;
  @ApiProperty({ format: 'uuid' }) @IsUUID() local_id!: string;
  @ApiProperty({ type: PaymentsDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => PaymentsDto)
  pagos!: PaymentsDto;
  @ApiProperty({ type: String, example: '18.00' })
  @IsString()
  @Matches(money)
  efectivo_recibido!: string;
}
export class PosQueryDto extends PaginationDto {
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.split(',') : value))
  @IsArray()
  @ArrayMaxSize(100)
  @IsUUID('all', { each: true })
  ids?: string[];
  @ApiProperty({ format: 'uuid' }) @IsUUID() local_id!: string;
  @ApiPropertyOptional({ maxLength: 160 })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  buscar?: string;
  @ApiPropertyOptional({ maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  codigo?: string;
}
export class PresentationDto {
  @ApiPropertyOptional({ nullable: true, maxLength: 120 }) @NullableText(120) codigo?:
    string | null;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() activo?: boolean;
  @ApiProperty({ format: 'uuid' }) @IsUUID() producto_id!: string;
  @ApiProperty({ maxLength: 80 }) @TrimmedText(80) nombre!: string;
  @ApiProperty({ minimum: 1, maximum: 1000000 }) @IsInt() @Min(1) @Max(1000000) unidades!: number;
  @ApiProperty({ type: String, example: '18.00' }) @IsString() @Matches(money) precio!: string;
}
export class PolicyDto {
  @ApiProperty({ type: String, example: '18.00' })
  @IsString()
  @Matches(money)
  limite_descuento!: string;
}

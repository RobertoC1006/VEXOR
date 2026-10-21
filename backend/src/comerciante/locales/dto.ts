import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

import { IsBoolean } from 'class-validator';
import { NullableText, TrimmedText } from '../../compartido/http/validation.js';
import { OptionalField } from '../../compartido/http/validation.js';
export class LocalCreateDto {
  @ApiPropertyOptional({ nullable: true }) @NullableText(160) mercado?: string | null;
  @ApiPropertyOptional({ nullable: true }) @NullableText(80) pabellon?: string | null;
  @ApiPropertyOptional({ nullable: true }) @NullableText(40) numero_puesto?: string | null;
  @ApiPropertyOptional({ nullable: true }) @NullableText(240) referencia?: string | null;
  @ApiProperty() @TrimmedText(120) nombre!: string;
  @ApiPropertyOptional({ default: false }) @OptionalField() @IsBoolean() habilitado_venta?: boolean;
  @ApiPropertyOptional({ default: true }) @OptionalField() @IsBoolean() activo?: boolean;
}

export class LocalPatchDto extends PartialType(LocalCreateDto, { skipNullProperties: false }) {}

import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

import { IsBoolean } from 'class-validator';
import { TrimmedText } from '../../compartido/http/validation.js';
import { OptionalField } from '../../compartido/http/validation.js';
export class LocalCreateDto {
  @ApiProperty() @TrimmedText(120) nombre!: string;
  @ApiPropertyOptional({ default: false }) @OptionalField() @IsBoolean() habilitado_venta?: boolean;
  @ApiPropertyOptional({ default: true }) @OptionalField() @IsBoolean() activo?: boolean;
}

export class LocalPatchDto extends PartialType(LocalCreateDto, { skipNullProperties: false }) {}

import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

import { NullableText, TrimmedText } from '../../compartido/http/validation.js';
import { OptionalField } from '../../compartido/http/validation.js';
export class BusinessPreferencesDto {
  @ApiPropertyOptional()
  @OptionalField()
  @IsIn(['simple', 'intermedio', 'avanzado'])
  nivel_registro?: 'simple' | 'intermedio' | 'avanzado';
  @ApiPropertyOptional() @OptionalField() @IsIn([5, 10]) elementos_por_pagina?: number;
  @ApiPropertyOptional({ type: [String] })
  @OptionalField()
  @IsArray()
  @ArrayMaxSize(20)
  @ArrayUnique()
  @IsString({ each: true })
  @Length(1, 40, { each: true })
  caracteristicas?: string[];
  @ApiPropertyOptional({ type: [String] })
  @OptionalField()
  @IsArray()
  @ArrayMaxSize(20)
  @ArrayUnique()
  @IsString({ each: true })
  @Length(1, 40, { each: true })
  ejes_variantes?: string[];
}
export class BusinessPatchDto {
  @ApiPropertyOptional({ nullable: true }) @NullableText(1000) descripcion?: string | null;
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(20000)
  @Matches(/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/)
  foto?: string | null;
  @ApiPropertyOptional({ type: BusinessPreferencesDto })
  @OptionalField()
  @ValidateNested()
  @Type(() => BusinessPreferencesDto)
  preferencias?: BusinessPreferencesDto;
  @ApiPropertyOptional({ nullable: true, example: 'Lencería' })
  @NullableText(120)
  rubro?: string | null;
  @ApiPropertyOptional() @OptionalField() @TrimmedText(160) nombre?: string;
  @ApiPropertyOptional({ example: 'America/Lima' })
  @OptionalField()
  @TrimmedText(80)
  zona_horaria?: string;
}

export class OnboardingStepDto {
  @IsIn([1, 2, 3])
  paso!: number;
}

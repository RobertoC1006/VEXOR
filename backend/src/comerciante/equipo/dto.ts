import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { TrimmedText } from '../../compartido/http/validation.js';
import { OptionalField } from '../../compartido/http/validation.js';
import { Instant } from '../../compartido/http/validation.js';
export class RoleCreateDto {
  @ApiProperty() @TrimmedText(80) nombre!: string;
}

export class RolePatchDto extends PartialType(RoleCreateDto, { skipNullProperties: false }) {
  @ApiPropertyOptional() @OptionalField() @IsBoolean() activo?: boolean;
}

export class RolePermissionsDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMaxSize(100)
  @ArrayUnique()
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  permisos!: string[];
}

export class MemberPatchDto {
  @ApiPropertyOptional() @OptionalField() @IsBoolean() activo?: boolean;
  @ApiPropertyOptional() @OptionalField() @IsBoolean() es_propietario?: boolean;
}

export class MemberRoleDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() rol_id!: string;
  @ApiPropertyOptional({ format: 'uuid', nullable: true }) @IsOptional() @IsUUID() local_id?:
    string | null;
}

export class MemberLocalsDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMaxSize(100)
  @ArrayUnique()
  @IsUUID('all', { each: true })
  locales_ids!: string[];
}

export class IndividualPermissionDto {
  @ApiProperty() @TrimmedText(80) permiso_codigo!: string;
  @ApiProperty({ enum: ['permitir', 'denegar'] }) @IsIn(['permitir', 'denegar']) efecto!:
    'permitir' | 'denegar';
  @ApiPropertyOptional({ format: 'uuid', nullable: true }) @IsOptional() @IsUUID() local_id?:
    string | null;
  @ApiPropertyOptional({ format: 'date-time' }) @OptionalField() @Instant() inicia_en?: string;
  @ApiPropertyOptional({ format: 'date-time', nullable: true }) @IsOptional() @Instant() vence_en?:
    string | null;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsString() @MaxLength(500) motivo?:
    string | null;
}

export class IndividualPermissionPatchDto {
  @ApiPropertyOptional({ enum: ['permitir', 'denegar'] })
  @OptionalField()
  @IsIn(['permitir', 'denegar'])
  efecto?: 'permitir' | 'denegar';
  @ApiPropertyOptional({ format: 'date-time' }) @OptionalField() @Instant() inicia_en?: string;
  @ApiPropertyOptional({ format: 'date-time', nullable: true }) @IsOptional() @Instant() vence_en?:
    string | null;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsString() @MaxLength(500) motivo?:
    string | null;
}

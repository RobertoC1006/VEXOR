import { applyDecorators } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { ArrayMaxSize, ArrayUnique, IsArray, IsBoolean, IsEmail, IsIn, IsInt, IsISO8601, IsOptional, IsString, IsUUID, Length, Max, MaxLength, Min } from 'class-validator';

const TrimmedText = (max:number) => applyDecorators(
  Transform(({value}:{value:unknown}) => typeof value==='string'?value.trim():value),IsString(),Length(1,max),
);
export class PaginationDto {
  @ApiPropertyOptional({default:25,minimum:1,maximum:100}) @Type(()=>Number) @IsInt() @Min(1) @Max(100) limit=25;
  @ApiPropertyOptional({default:0,minimum:0,maximum:100000}) @Type(()=>Number) @IsInt() @Min(0) @Max(100000) offset=0;
}
export class ProfilePatchDto { @ApiProperty() @TrimmedText(120) nombre!:string; }
export class BusinessPatchDto {
  @ApiPropertyOptional() @IsOptional() @TrimmedText(160) nombre?:string;
  @ApiPropertyOptional({example:'America/Lima'}) @IsOptional() @TrimmedText(80) zona_horaria?:string;
}
export class LocalCreateDto {
  @ApiProperty() @TrimmedText(120) nombre!:string;
  @ApiPropertyOptional({default:false}) @IsOptional() @IsBoolean() habilitado_venta?:boolean;
  @ApiPropertyOptional({default:true}) @IsOptional() @IsBoolean() activo?:boolean;
}
export class LocalPatchDto extends PartialType(LocalCreateDto) {}
export class RoleCreateDto { @ApiProperty() @TrimmedText(80) nombre!:string; }
export class RolePatchDto extends PartialType(RoleCreateDto) {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() activo?:boolean;
}
export class RolePermissionsDto {
  @ApiProperty({type:[String]}) @IsArray() @ArrayMaxSize(100) @ArrayUnique() @IsString({each:true}) @MaxLength(80,{each:true}) permisos!:string[];
}
export class MemberPatchDto {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() activo?:boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() es_propietario?:boolean;
}
export class MemberRoleDto {
  @ApiProperty({format:'uuid'}) @IsUUID() rol_id!:string;
  @ApiPropertyOptional({format:'uuid',nullable:true}) @IsOptional() @IsUUID() local_id?:string|null;
}
export class MemberLocalsDto {
  @ApiProperty({type:[String]}) @IsArray() @ArrayMaxSize(100) @ArrayUnique() @IsUUID('all',{each:true}) locales_ids!:string[];
}
export class IndividualPermissionDto {
  @ApiProperty() @TrimmedText(80) permiso_codigo!:string;
  @ApiProperty({enum:['permitir','denegar']}) @IsIn(['permitir','denegar']) efecto!:'permitir'|'denegar';
  @ApiPropertyOptional({format:'uuid',nullable:true}) @IsOptional() @IsUUID() local_id?:string|null;
  @ApiPropertyOptional({format:'date-time'}) @IsOptional() @IsISO8601({strict:true}) inicia_en?:string;
  @ApiPropertyOptional({format:'date-time',nullable:true}) @IsOptional() @IsISO8601({strict:true}) vence_en?:string|null;
  @ApiPropertyOptional({nullable:true}) @IsOptional() @IsString() @MaxLength(500) motivo?:string|null;
}
export class IndividualPermissionPatchDto {
  @ApiPropertyOptional({enum:['permitir','denegar']}) @IsOptional() @IsIn(['permitir','denegar']) efecto?:'permitir'|'denegar';
  @ApiPropertyOptional({format:'date-time'}) @IsOptional() @IsISO8601({strict:true}) inicia_en?:string;
  @ApiPropertyOptional({format:'date-time',nullable:true}) @IsOptional() @IsISO8601({strict:true}) vence_en?:string|null;
  @ApiPropertyOptional({nullable:true}) @IsOptional() @IsString() @MaxLength(500) motivo?:string|null;
}
export class InvitationDto {
  @ApiProperty() @Transform(({value}:{value:unknown})=>typeof value==='string'?value.trim().toLowerCase():value) @IsEmail() @MaxLength(254) email!:string;
  @ApiProperty() @TrimmedText(120) nombre!:string;
}
export class BusinessInvitationDto extends InvitationDto {
  @ApiProperty() @TrimmedText(160) negocio_nombre!:string;
  @ApiPropertyOptional({default:'America/Lima'}) @TrimmedText(80) zona_horaria='America/Lima';
}

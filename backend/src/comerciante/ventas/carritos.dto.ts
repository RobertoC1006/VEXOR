import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { NullableText } from '../../compartido/http/validation.js';
import { PaginationDto } from '../../compartido/http/pagination.dto.js';
import { CartContentDto } from './dto.js';
export class CartSaveDto extends CartContentDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() local_id!: string;
  @ApiProperty({ minimum: 0 }) @IsInt() @Min(0) @Max(2147483646) version!: number;
  @ApiPropertyOptional({ nullable: true, maxLength: 80 }) @NullableText(80) nombre?: string | null;
}
export class CartVersionDto {
  @ApiProperty({ minimum: 1 }) @IsInt() @Min(1) @Max(2147483646) version!: number;
}
export class CartQueryDto extends PaginationDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() local_id!: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() excluir_id?: string;
}

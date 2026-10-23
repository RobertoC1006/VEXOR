import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsUUID, Max, Min, NotEquals } from 'class-validator';
import { OptionalField, TrimmedText } from '../../compartido/http/validation.js';
import { PaginationDto } from '../../compartido/http/pagination.dto.js';
export class MovementQueryDto extends PaginationDto {
  @ApiPropertyOptional() @OptionalField() @IsUUID() producto_id?: string;
}
export class AdjustmentDto {
  @ApiProperty() @IsUUID() operacion_id!: string;
  @ApiProperty() @IsUUID() producto_id!: string;
  @ApiProperty() @IsInt() @Min(-2147483646) @Max(2147483647) @NotEquals(0) cantidad!: number;
  @ApiProperty() @TrimmedText(240) motivo!: string;
  @ApiProperty({ description: 'Saldo que el usuario revisó antes de confirmar' })
  @IsInt()
  @Min(0)
  @Max(2147483647)
  saldo_esperado!: number;
}
export class TransferDto extends AdjustmentDto {
  @ApiProperty() @IsUUID() destino_id!: string;
  @Min(1) declare cantidad: number;
}
export class ReceiptDto {
  @ApiProperty() @IsUUID() operacion_id!: string;
  @ApiProperty() @IsUUID() traslado_id!: string;
  @ApiProperty() @IsInt() @Min(1) @Max(2147483647) cantidad!: number;
  @ApiProperty({ description: 'En recepción parcial explica la diferencia' })
  @TrimmedText(240)
  motivo!: string;
}

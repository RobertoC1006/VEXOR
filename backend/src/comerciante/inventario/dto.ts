import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Equals, IsInt, Max, Min, ValidateIf, IsIn, IsUUID } from 'class-validator';
import { NullableText, OptionalField } from '../../compartido/http/validation.js';
import { ProductQueryDto } from '../productos/dto.js';

export class InventoryQueryDto extends ProductQueryDto {
  @ApiPropertyOptional() @OptionalField() @IsUUID() producto_id?: string;
  @ApiPropertyOptional({ enum: ['bajo', 'pendiente'] })
  @OptionalField()
  @IsIn(['bajo', 'pendiente'])
  estado_stock?: 'bajo' | 'pendiente';
}
export class CountSaveDto {
  @ApiProperty() @IsInt() @Min(0) @Max(2147483647) cantidad!: number;
  @ApiProperty({ description: '0 al crear; versión recibida al editar' })
  @IsInt()
  @Min(0)
  @Max(2147483647)
  version!: number;
  @ApiPropertyOptional({ nullable: true }) @NullableText(240) referencia?: string | null;
}
export class CountConfirmDto {
  @ApiProperty() @IsInt() @Min(1) @Max(2147483647) version!: number;
  @ApiProperty({
    description: 'Confirmar que la cantidad guardada refleja lo que queda físicamente',
  })
  @Equals(true)
  revision_fisica!: boolean;
}

export class MinimumSaveDto {
  @ApiProperty({ nullable: true })
  @ValidateIf((_o, v) => v !== null)
  @IsInt()
  @Min(1)
  @Max(2147483647)
  minimo!: number | null;
  @ApiProperty() @IsInt() @Min(0) @Max(2147483647) version!: number;
}

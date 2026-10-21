import { ApiPropertyOptional } from '@nestjs/swagger';

import { NullableText, TrimmedText } from '../../compartido/http/validation.js';
import { OptionalField } from '../../compartido/http/validation.js';
export class BusinessPatchDto {
  @ApiPropertyOptional({ nullable: true, example: 'Lencería' })
  @NullableText(120)
  rubro?: string | null;
  @ApiPropertyOptional() @OptionalField() @TrimmedText(160) nombre?: string;
  @ApiPropertyOptional({ example: 'America/Lima' })
  @OptionalField()
  @TrimmedText(80)
  zona_horaria?: string;
}

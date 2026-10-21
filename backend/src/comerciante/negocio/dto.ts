import { ApiPropertyOptional } from '@nestjs/swagger';

import { TrimmedText } from '../../compartido/http/validation.js';
import { OptionalField } from '../../compartido/http/validation.js';
export class BusinessPatchDto {
  @ApiPropertyOptional() @OptionalField() @TrimmedText(160) nombre?: string;
  @ApiPropertyOptional({ example: 'America/Lima' })
  @OptionalField()
  @TrimmedText(80)
  zona_horaria?: string;
}

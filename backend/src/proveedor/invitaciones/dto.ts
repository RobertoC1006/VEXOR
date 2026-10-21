import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { TrimmedText } from '../../compartido/http/validation.js';
import { InvitationDto } from '../../compartido/invitaciones/dto.js';
export class BusinessInvitationDto extends InvitationDto {
  @ApiProperty() @TrimmedText(160) negocio_nombre!: string;
  @ApiPropertyOptional({ default: 'America/Lima' }) @TrimmedText(80) zona_horaria = 'America/Lima';
}

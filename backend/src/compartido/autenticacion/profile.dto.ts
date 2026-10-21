import { ApiProperty } from '@nestjs/swagger';

import { TrimmedText } from '../http/validation.js';
export class ProfilePatchDto {
  @ApiProperty() @TrimmedText(120) nombre!: string;
}

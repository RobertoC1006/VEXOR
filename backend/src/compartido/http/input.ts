import { BadRequestException } from '@nestjs/common';

export function requirePatch(data: object) {
  if (!Object.values(data).some((value) => value !== undefined)) {
    throw new BadRequestException('Indica al menos un campo para modificar');
  }
}

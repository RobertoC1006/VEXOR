import { BadRequestException } from '@nestjs/common';
export function validateJpeg(foto: string) {
  const bytes = Buffer.from(foto.slice('data:image/jpeg;base64,'.length), 'base64');
  if (
    bytes.length < 4 ||
    bytes[0] !== 255 ||
    bytes[1] !== 216 ||
    bytes.at(-2) !== 255 ||
    bytes.at(-1) !== 217
  )
    throw new BadRequestException('La miniatura debe ser una imagen JPEG');
}

import { BadRequestException } from '@nestjs/common';
import type { Transaction } from 'kysely';
import type { Database } from '../../compartido/database/database.js';

export async function savePhoto(
  tx: Transaction<Database>,
  negocioId: string,
  id: string,
  foto?: string | null,
) {
  if (foto === undefined) return;
  if (foto === null) {
    await tx
      .deleteFrom('app.productos_fotos')
      .where('negocio_id', '=', negocioId)
      .where('producto_id', '=', id)
      .execute();
    return;
  }
  const bytes = Buffer.from(foto.slice('data:image/jpeg;base64,'.length), 'base64');
  if (
    bytes.length < 4 ||
    bytes[0] !== 255 ||
    bytes[1] !== 216 ||
    bytes.at(-2) !== 255 ||
    bytes.at(-1) !== 217
  )
    throw new BadRequestException('La miniatura debe ser una imagen JPEG');
  await tx
    .insertInto('app.productos_fotos')
    .values({ negocio_id: negocioId, producto_id: id, imagen: foto })
    .onConflict((c) => c.columns(['negocio_id', 'producto_id']).doUpdateSet({ imagen: foto }))
    .execute();
}

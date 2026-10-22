import { validateJpeg } from '../../compartido/http/image.js';
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
  validateJpeg(foto);
  await tx
    .insertInto('app.productos_fotos')
    .values({ negocio_id: negocioId, producto_id: id, imagen: foto })
    .onConflict((c) => c.columns(['negocio_id', 'producto_id']).doUpdateSet({ imagen: foto }))
    .execute();
}

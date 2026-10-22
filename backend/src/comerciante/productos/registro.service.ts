import { BadRequestException, Injectable } from '@nestjs/common';
import { DatabaseService, type Actor } from '../../compartido/database/database.service.js';
import { requirePermission } from '../../compartido/database/database.js';
import { ProductsService } from './productos.service.js';
import type { RegistrationDto } from './dto.js';

@Injectable()
export class ProductRegistrationService {
  constructor(
    private readonly database: DatabaseService,
    private readonly products: ProductsService,
  ) {}
  save(actor: Actor, negocioId: string, data: RegistrationDto, id?: string) {
    if (id && data.version === undefined)
      throw new BadRequestException('Falta la versión del modelo');
    if (!id && data.combinaciones.some((c) => c.id))
      throw new BadRequestException('Un modelo nuevo no tiene combinaciones existentes');
    if (data.combinaciones.length && data.producto.nivel_registro !== 'avanzado')
      throw new BadRequestException('Las combinaciones requieren registro avanzado');
    if (data.combinaciones.some((c) => c.foto !== undefined))
      throw new BadRequestException('La foto se registra en el modelo');
    const ids = data.combinaciones.filter((c) => c.id).map((c) => c.id);
    if (
      new Set(ids).size !== ids.length ||
      data.combinaciones.some((c) => c.id && c.version === undefined)
    )
      throw new BadRequestException('Revisa las versiones e identificadores de las combinaciones');
    return this.database.tenant(actor, negocioId, async (tx) => {
      await requirePermission(tx, 'productos.gestionar');
      const producto = id
        ? await this.products.patchInTransaction(
            tx,
            negocioId,
            id,
            { ...data.producto, version: data.version! },
            null,
          )
        : await this.products.createInTransaction(tx, negocioId, data.producto);
      const updates = data.combinaciones.filter((c) => c.id);
      const inserts = data.combinaciones.filter((c) => !c.id);
      for (const item of updates) {
        const { id: childId, version, ...fields } = item;
        await this.products.patchInTransaction(
          tx,
          negocioId,
          childId!,
          {
            ...fields,
            nivel_registro: 'simple',
            categoria_id: null,
            ejes_variantes: [],
            version: version!,
          },
          producto.id,
        );
      }
      if (inserts.length)
        await tx
          .insertInto('app.productos')
          .values(
            inserts.map((item) => {
              const { id: _id, version: _version, foto: _foto, ...fields } = item;
              return {
                ...fields,
                negocio_id: negocioId,
                producto_padre_id: producto.id,
                nivel_registro: 'simple' as const,
                categoria_id: null,
                ejes_variantes: [],
                caracteristicas: JSON.stringify(fields.caracteristicas ?? []),
              };
            }),
          )
          .execute();
      return producto;
    });
  }
}

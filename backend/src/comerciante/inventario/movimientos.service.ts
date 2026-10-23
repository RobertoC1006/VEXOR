import { ConflictException, Injectable, BadRequestException } from '@nestjs/common';
import { sql } from 'kysely';
import { DatabaseService, type Actor } from '../../compartido/database/database.service.js';
import { requirePermission } from '../../compartido/database/database.js';
import { requireProductRead } from '../productos/productos.service.js';
import { requireInventoryLocal, inventoryRights } from './access.js';
import { page } from '../../compartido/http/pagination.js';
import type {
  AdjustmentDto,
  TransferDto,
  ReceiptDto,
  MovementQueryDto,
} from './movimientos.dto.js';

@Injectable()
export class MovementsService {
  constructor(private readonly database: DatabaseService) {}
  detail(actor: Actor, negocioId: string, productoId: string) {
    return this.database.tenant(actor, negocioId, async (tx) => {
      await requireProductRead(tx);
      const selected = await tx
        .selectFrom('app.productos')
        .selectAll()
        .where('negocio_id', '=', negocioId)
        .where('id', '=', productoId)
        .executeTakeFirstOrThrow();
      const product = selected.producto_padre_id
        ? await tx
            .selectFrom('app.productos')
            .selectAll()
            .where('negocio_id', '=', negocioId)
            .where('id', '=', selected.producto_padre_id)
            .executeTakeFirstOrThrow()
        : selected;
      const locals = await tx
        .selectFrom('app.locales')
        .select(['id', 'nombre', 'habilitado_venta'])
        .where('negocio_id', '=', negocioId)
        .where('activo', '=', true)
        .where(
          sql<boolean>`app_private.accede_local(id) and (app_private.puede('inventario.ver',id) or app_private.puede('inventario.contar',id) or app_private.puede('inventario.confirmar',id))`,
        )
        .orderBy('nombre')
        .execute();
      const permitted = await Promise.all(
        locals.map(async (l) => ({ ...l, ...(await inventoryRights(tx, l.id)) })),
      );
      const variants = await tx
        .selectFrom('app.productos')
        .selectAll()
        .where('negocio_id', '=', negocioId)
        .where((eb) => eb.or([eb('id', '=', product.id), eb('producto_padre_id', '=', product.id)]))
        .where('nivel_registro', '!=', 'avanzado')
        .orderBy('nombre')
        .orderBy('id')
        .execute();
      const stocks = (
        await sql<{
          local_id: string;
          producto_id: string;
          cantidad: number | null;
          estado: string;
          minimo: number | null;
        }>`
        select l.id local_id,p.id producto_id,i.cantidad,coalesce(i.estado,'pendiente') estado,m.minimo
        from app.locales l cross join app.productos p
        left join app.existencias i on i.negocio_id=p.negocio_id and i.producto_id=p.id and i.local_id=l.id
        left join app.stock_minimos m on m.negocio_id=p.negocio_id and m.producto_id=p.id and m.local_id=l.id
        where l.negocio_id=${negocioId}::uuid and p.negocio_id=l.negocio_id and l.id=any(${locals.map((l) => l.id)}::uuid[]) and p.nivel_registro<>'avanzado' and (p.id=${product.id}::uuid or p.producto_padre_id=${product.id}::uuid)`.execute(
          tx,
        )
      ).rows;
      const transits = (
        await sql<{
          producto_id: string;
          cantidad: number;
        }>`select s.producto_id, sum(s.cantidad-coalesce((select sum(r.cantidad) from app.stock_movimientos r where r.negocio_id=s.negocio_id and r.traslado_id=s.id),0))::int cantidad
        from app.stock_movimientos s join app.productos p on p.negocio_id=s.negocio_id and p.id=s.producto_id
        where s.negocio_id=${negocioId}::uuid and s.tipo='salida' and (p.id=${product.id}::uuid or p.producto_padre_id=${product.id}::uuid) group by s.producto_id`.execute(
          tx,
        )
      ).rows;
      return {
        producto: product,
        seleccionado: productoId,
        locales: permitted,
        combinaciones: variants,
        existencias: stocks,
        transitos: transits,
      };
    });
  }
  list(actor: Actor, negocioId: string, localId: string, p: MovementQueryDto, transfers = false) {
    return this.database.tenant(actor, negocioId, async (tx) => {
      await requireInventoryLocal(tx, negocioId, localId);
      await requireProductRead(tx);
      await inventoryRights(tx, localId);
      let q = tx
        .selectFrom('app.stock_movimientos as m')
        .innerJoin('app.productos as p', (j) =>
          j.onRef('p.id', '=', 'm.producto_id').onRef('p.negocio_id', '=', 'm.negocio_id'),
        )
        .selectAll('m')
        .select(['p.nombre', 'p.producto_padre_id'])
        .select(
          sql<number>`coalesce((select sum(r.cantidad) from app.stock_movimientos r where r.negocio_id=m.negocio_id and r.traslado_id=m.id),0)::int`.as(
            'recibidas',
          ),
        )
        .where('m.negocio_id', '=', negocioId);
      q = transfers
        ? q
            .where('m.tipo', '=', 'salida')
            .where((eb) =>
              eb.or([eb('m.local_id', '=', localId), eb('m.destino_id', '=', localId)]),
            )
        : q.where('m.local_id', '=', localId);
      if (p.producto_id)
        q = q.where((eb) =>
          eb.or([eb('p.id', '=', p.producto_id!), eb('p.producto_padre_id', '=', p.producto_id!)]),
        );
      return page(
        await q
          .orderBy('m.creado_en', 'desc')
          .orderBy('m.id')
          .limit(p.limit + 1)
          .offset(p.offset)
          .execute(),
        p,
      );
    });
  }
  write(
    actor: Actor,
    negocioId: string,
    localId: string,
    type: 'ajuste' | 'salida' | 'recepcion',
    d: AdjustmentDto | TransferDto | ReceiptDto,
  ) {
    return this.database.tenant(actor, negocioId, async (tx) => {
      await requireInventoryLocal(tx, negocioId, localId);
      await requireProductRead(tx);
      await inventoryRights(tx, localId);
      await requirePermission(
        tx,
        `inventario.${type === 'ajuste' ? 'ajustar' : type === 'salida' ? 'transferir' : 'recibir'}`,
        localId,
      );
      // La clave representa el intento completo; una respuesta perdida se puede reintentar.
      await sql`select pg_advisory_xact_lock(hashtext(${negocioId + d.operacion_id}))`.execute(tx);
      const existing = await tx
        .selectFrom('app.stock_movimientos')
        .selectAll()
        .where('negocio_id', '=', negocioId)
        .where('operacion_id', '=', d.operacion_id)
        .executeTakeFirst();
      if (existing) {
        if (
          existing.tipo !== type ||
          existing.local_id !== localId ||
          existing.cantidad !== d.cantidad ||
          existing.motivo !== d.motivo ||
          ('producto_id' in d && existing.producto_id !== d.producto_id) ||
          ('destino_id' in d && existing.destino_id !== d.destino_id) ||
          ('traslado_id' in d && existing.traslado_id !== d.traslado_id)
        )
          throw new ConflictException('La clave de operación ya corresponde a otro movimiento');
        return existing;
      }
      let productId: string;
      if ('traslado_id' in d) {
        const transfer = await tx
          .selectFrom('app.stock_movimientos')
          .selectAll()
          .where('negocio_id', '=', negocioId)
          .where('id', '=', d.traslado_id)
          .where('tipo', '=', 'salida')
          .executeTakeFirstOrThrow();
        if (transfer.destino_id !== localId)
          throw new BadRequestException('El traslado pertenece a otro destino');
        productId = transfer.producto_id;
      } else productId = d.producto_id;
      await sql`select pg_advisory_xact_lock(hashtext(${negocioId + productId}))`.execute(tx);
      const stock = await tx
        .selectFrom('app.existencias')
        .selectAll()
        .where('negocio_id', '=', negocioId)
        .where('local_id', '=', localId)
        .where('producto_id', '=', productId)
        .executeTakeFirst();
      if (stock?.estado !== 'confirmado')
        throw new ConflictException(
          'Confirma primero el conteo de este producto en el local, incluso si es cero',
        );
      if ('saldo_esperado' in d && stock.cantidad !== d.saldo_esperado)
        throw new ConflictException(
          'El stock cambió. Revisa el saldo actualizado antes de continuar',
        );
      if (
        (type === 'salida' && d.cantidad > stock.cantidad) ||
        (type === 'ajuste' && stock.cantidad + d.cantidad < 0)
      )
        throw new ConflictException('No hay suficientes unidades disponibles');
      if ('destino_id' in d) {
        if (localId === d.destino_id)
          throw new BadRequestException('El destino debe ser otro local');
        await requireInventoryLocal(tx, negocioId, d.destino_id);
        await inventoryRights(tx, d.destino_id);
        const dest = await tx
          .selectFrom('app.existencias')
          .select('estado')
          .where('negocio_id', '=', negocioId)
          .where('local_id', '=', d.destino_id)
          .where('producto_id', '=', productId)
          .executeTakeFirst();
        if (dest?.estado !== 'confirmado')
          throw new ConflictException(
            'Cuenta y confirma este producto en el destino antes de trasladarlo',
          );
      }
      if ('traslado_id' in d) {
        const total = await tx
          .selectFrom('app.stock_movimientos')
          .select('cantidad')
          .where('negocio_id', '=', negocioId)
          .where('id', '=', d.traslado_id)
          .executeTakeFirstOrThrow();
        const received = (
          await sql<{
            n: number;
          }>`select coalesce(sum(cantidad),0)::int n from app.stock_movimientos where negocio_id=${negocioId}::uuid and traslado_id=${d.traslado_id}::uuid`.execute(
            tx,
          )
        ).rows[0].n;
        if (d.cantidad > total.cantidad - received)
          throw new ConflictException('La cantidad supera lo que queda en tránsito');
      }
      return tx
        .insertInto('app.stock_movimientos')
        .values({
          negocio_id: negocioId,
          operacion_id: d.operacion_id,
          producto_id: productId,
          local_id: localId,
          tipo: type,
          cantidad: d.cantidad,
          motivo: d.motivo,
          ...('destino_id' in d ? { destino_id: d.destino_id } : {}),
          ...('traslado_id' in d ? { traslado_id: d.traslado_id } : {}),
        })
        .returningAll()
        .executeTakeFirstOrThrow();
    });
  }
}

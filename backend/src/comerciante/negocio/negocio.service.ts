import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { sql, type Transaction } from 'kysely';
import type { Database } from '../../compartido/database/database.js';
import { validateJpeg } from '../../compartido/http/image.js';
import { DatabaseService, type Actor } from '../../compartido/database/database.service.js';
import { requirePermission } from '../../compartido/database/database.js';
import { currentMembership, requireOwner } from '../../compartido/autorizacion/authorization.js';
import { requirePatch } from '../../compartido/http/input.js';
import { page } from '../../compartido/http/pagination.js';
import type { BusinessPatchDto } from './dto.js';
import type { PaginationDto } from '../../compartido/http/pagination.dto.js';
@Injectable()
export class BusinessService {
  constructor(private readonly database: DatabaseService) {}
  private detail(tx: Transaction<Database>, negocioId: string) {
    return tx
      .selectFrom('app.negocios as n')
      .leftJoin('app.negocio_perfil as p', 'p.negocio_id', 'n.id')
      .select([
        'n.id',
        'n.nombre',
        'n.rubro',
        'n.zona_horaria',
        'n.activo',
        'p.descripcion',
        'p.foto',
        'p.preferencias',
        'p.onboarding_paso',
      ])
      .where('n.id', '=', negocioId)
      .executeTakeFirstOrThrow();
  }
  business(actor: Actor, negocioId: string) {
    return this.database.tenant(actor, negocioId, (tx) => this.detail(tx, negocioId));
  }
  advanceOnboarding(actor: Actor, negocioId: string, paso: number) {
    return this.database.tenant(actor, negocioId, async (tx) => {
      await requireOwner(tx);
      const business = await tx
        .selectFrom('app.negocios')
        .selectAll()
        .where('id', '=', negocioId)
        .forUpdate()
        .executeTakeFirstOrThrow();
      const profile = await tx
        .selectFrom('app.negocio_perfil')
        .select('onboarding_paso')
        .where('negocio_id', '=', negocioId)
        .executeTakeFirst();
      const current = profile?.onboarding_paso ?? 3;
      if (current === 3) return this.detail(tx, negocioId);
      if (paso > current + 1)
        throw new ConflictException('Completa el paso anterior antes de continuar.');
      if (!business.nombre.trim() || !business.rubro?.trim())
        throw new BadRequestException('Completa el nombre y el rubro de tu negocio.');
      if (paso >= 2) {
        const local = await tx
          .selectFrom('app.locales')
          .select('id')
          .where('negocio_id', '=', negocioId)
          .where('activo', '=', true)
          .where('habilitado_venta', '=', true)
          .executeTakeFirst();
        if (!local) throw new BadRequestException('Agrega un puesto activo para empezar a vender.');
      }
      await tx
        .updateTable('app.negocio_perfil')
        .set({ onboarding_paso: Math.max(current, paso) })
        .where('negocio_id', '=', negocioId)
        .execute();
      return this.detail(tx, negocioId);
    });
  }
  patchBusiness(actor: Actor, negocioId: string, data: BusinessPatchDto) {
    requirePatch(data);
    return this.database.tenant(actor, negocioId, async (tx) => {
      await requirePermission(tx, 'negocio.editar');
      const { descripcion, foto, preferencias, ...fields } = data;
      if (foto) validateJpeg(foto);
      // Lock the business for atomic profile merges and preserve unrelated preferences.
      const current = await tx
        .selectFrom('app.negocios')
        .select('nombre')
        .where('id', '=', negocioId)
        .forUpdate()
        .executeTakeFirstOrThrow();
      await tx
        .updateTable('app.negocios')
        .set({ ...fields, nombre: fields.nombre ?? current.nombre })
        .where('id', '=', negocioId)
        .execute();
      if (descripcion !== undefined || foto !== undefined || preferencias !== undefined) {
        const profile = await tx
          .selectFrom('app.negocio_perfil')
          .selectAll()
          .where('negocio_id', '=', negocioId)
          .executeTakeFirst();
        const values = {
          descripcion: descripcion === undefined ? profile?.descripcion : descripcion,
          foto: foto === undefined ? profile?.foto : foto,
          preferencias: JSON.stringify({
            ...profile?.preferencias,
            ...Object.fromEntries(
              Object.entries(preferencias ?? {}).filter(([, value]) => value !== undefined),
            ),
          }),
        };
        await tx
          .insertInto('app.negocio_perfil')
          .values({ negocio_id: negocioId, ...values })
          .onConflict((c) => c.column('negocio_id').doUpdateSet(values))
          .execute();
      }
      return this.detail(tx, negocioId);
    });
  }
  access(actor: Actor, negocioId: string, p: PaginationDto) {
    return this.database.tenant(actor, negocioId, async (tx) => {
      const member = await currentMembership(tx);
      const actions = (
        await sql<{
          codigo: string;
          alcance: string;
          permitido: boolean | null;
        }>`select codigo,alcance,
        case when p.alcance='negocio' then app_private.puede(p.codigo) else exists(select 1 from app.locales l where l.negocio_id=${negocioId}::uuid and l.activo and app_private.puede(p.codigo,l.id)) end as permitido from app.permisos p order by codigo`.execute(
          tx,
        )
      ).rows;
      const localPage = page(
        await tx
          .selectFrom('app.locales')
          .select(['id', 'nombre', 'activo', 'habilitado_venta'])
          .where('negocio_id', '=', negocioId)
          .orderBy('id')
          .limit(p.limit + 1)
          .offset(p.offset)
          .execute(),
        p,
      );
      const locals = localPage.items;
      const localActions = (
        await sql<{
          local_id: string;
          codigo: string;
          permitido: boolean;
        }>`select l.id as local_id,p.codigo,app_private.puede(p.codigo,l.id) as permitido
        from app.locales l cross join app.permisos p where p.alcance='local' and l.negocio_id=${negocioId}::uuid
        and l.id=any(${locals.map((l) => l.id)}::uuid[]) order by l.id,p.codigo`.execute(tx)
      ).rows;
      return {
        ...member,
        acciones: actions,
        locales: locals.map((l) => ({
          ...l,
          acciones: localActions
            .filter((a) => a.local_id === l.id)
            .map(({ codigo, permitido }) => ({ codigo, permitido })),
        })),
        limit: p.limit,
        offset: p.offset,
        has_more: localPage.has_more,
      };
    });
  }
}

import { sql } from 'kysely';
/** A stock alert always uses confirmed stock and an explicitly configured minimum. */
export const stockAlert = () =>
  sql<boolean>`i.confirmado_en is not null and m.minimo is not null and i.cantidad <= m.minimo`;

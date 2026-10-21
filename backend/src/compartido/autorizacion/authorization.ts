import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { sql, type Transaction } from 'kysely';
import { requirePermission, type Database } from '../database/database.js';

export async function currentMembership(tx: Transaction<Database>) {
  const result = await sql<{ miembro_id: string; es_propietario: boolean }>`
    select app_private.miembro_actual() as miembro_id,
      app_private.es_propietario() as es_propietario
  `.execute(tx);
  return result.rows[0];
}

export async function requireOwner(tx: Transaction<Database>) {
  const member = await currentMembership(tx);
  if (!member.es_propietario) {
    throw new ForbiddenException('Se requiere ser propietario del negocio');
  }
  return member;
}

export async function requireMemberAccess(tx: Transaction<Database>, memberId: string) {
  const member = await currentMembership(tx);
  if (member.miembro_id !== memberId) await requirePermission(tx, 'equipo.ver');
}

export async function requireLocalAccess(tx: Transaction<Database>, localId: string) {
  const member = await currentMembership(tx);
  if (member.es_propietario) return member;
  const result = await sql<{ permitido: boolean }>`
    select app_private.accede_local(${localId}::uuid) as permitido
  `.execute(tx);
  if (!result.rows[0].permitido) {
    throw new NotFoundException('Local no encontrado en tu acceso al negocio');
  }
  return member;
}

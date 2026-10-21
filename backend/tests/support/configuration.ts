import assert from 'node:assert/strict';
import type { Response } from 'supertest';

type Request = (
  method: 'get' | 'post' | 'patch' | 'put' | 'delete',
  url: string,
  actor: number | undefined,
  status: number,
  body?: object,
  key?: string,
) => Promise<Response>;

/** Usa el mismo servidor HTTP, Auth controlado y PostgreSQL desechable del runner. */
export async function testConfiguration(request: Request, id: (n: number) => string) {
  const base = `/api/v1/negocios/${id(201)}`;
  const worker = `${base}/miembros/${id(303)}`;
  const local = `${base}/locales/${id(401)}`;
  const role = `${base}/roles/${id(501)}`;

  // Abrir una ficha por URL conserva el aislamiento y el acceso propio al equipo.
  assert.equal((await request('get', local, 3, 200)).body.id, id(401));
  await request('get', `${base}/locales/${id(402)}`, 3, 404);
  await request('get', `${base}/locales/${id(404)}`, 1, 404);
  await request('get', `${base}/locales/${id(999)}`, 1, 404);
  await request('get', local, undefined, 401);
  await request('get', local.replace(id(201), id(202)), 1, 403);
  await request('get', `${base}/locales/invalido`, 1, 400);
  assert.equal((await request('get', worker, 3, 200)).body.nombre, 'Persona 3');
  await request('get', `${base}/miembros/${id(302)}`, 3, 403);
  await request('get', `${base}/miembros/${id(304)}`, 1, 404);
  await request('get', `${base}/roles/${id(502)}`, 1, 404);
  await request('get', role, 1, 200);
  await request('get', role, 3, 403);
  for (const path of ['roles', 'locales', 'permisos']) {
    await request('get', `${worker}/${path}`, 3, 200);
    await request('get', `${base}/miembros/${id(302)}/${path}`, 3, 403);
  }

  // null no sustituye la omisión de un campo obligatorio; no modificar datos ante error.
  const before = (await request('get', base, 1, 200)).body;
  for (const body of [
    {},
    { nombre: null },
    { zona_horaria: null },
    { nombre: '  ' },
    { activo: false },
  ]) {
    await request('patch', base, 1, 400, body);
  }
  assert.deepEqual((await request('get', base, 1, 200)).body, before);
  // Rubro libre, ubicación por local y las mismas fronteras de autorización.
  const businessWithRubro = (await request('patch', base, 1, 200, { rubro: ' Lencería y regalos ' })).body;
  assert.equal(businessWithRubro.rubro, 'Lencería y regalos');
  assert.equal(businessWithRubro.zona_horaria, before.zona_horaria);
  assert.equal((await request('get', base, 1, 200)).body.rubro, 'Lencería y regalos');
  await request('patch', base, 3, 403, { rubro: 'No autorizado' });
  for (const rubro of [' ', 'x'.repeat(121), 42]) await request('patch', base, 1, 400, { rubro });
  assert.equal((await request('patch', base, 1, 200, { rubro: null })).body.rubro, null);
  const location = { mercado: ' Mercado Central ', pabellon: ' B ', numero_puesto: ' 024-A ', referencia: ' Junto a la entrada ' };
  const located = (await request('patch', local, 1, 200, location)).body;
  assert.equal(located.mercado, 'Mercado Central');
  assert.equal(located.pabellon, 'B');
  assert.equal(located.numero_puesto, '024-A');
  assert.equal((await request('get', local, 3, 200)).body.referencia, 'Junto a la entrada');
  await request('patch', local, 3, 403, { mercado: 'Sin permiso de edición' });
  await request('patch', `${base}/locales/${id(404)}`, 1, 404, { mercado: 'Otro negocio' });
  for (const body of [{ mercado: '' }, { pabellon: 'x'.repeat(81) }, { numero_puesto: 24 }, { referencia: 'x'.repeat(241) }])
    await request('patch', local, 1, 400, body);
  const clearedLocation = (await request('patch', local, 1, 200, { mercado: null, pabellon: null, numero_puesto: null, referencia: null })).body;
  assert.equal(clearedLocation.mercado, null);
  assert.equal(clearedLocation.numero_puesto, null);
  for (const body of [
    {},
    { nombre: null },
    { activo: null },
    { habilitado_venta: null },
    { activo: 'false' },
  ]) {
    await request('patch', local, 1, 400, body);
  }
  await request('post', `${base}/locales`, 1, 400, { nombre: 'Almacén', activo: null });
  for (const body of [{}, { nombre: null }, { activo: null }]) {
    await request('patch', role, 1, 400, body);
  }
  for (const body of [{}, { activo: null }, { es_propietario: null }]) {
    await request('patch', worker, 1, 400, body);
  }

  // Mensajes acotados para los conflictos que la interfaz necesita explicar.
  const limit = await request('post', `${base}/locales`, 1, 409, {
    nombre: 'Otro puesto',
    habilitado_venta: true,
  });
  assert.equal(limit.body.error.code, 'LIMITE_PUESTOS_ACTIVOS');
  const duplicate = await request('post', `${base}/roles`, 1, 409, { nombre: ' VENDEDOR ' });
  assert.equal(duplicate.body.error.code, 'NOMBRE_ROL_DUPLICADO');

  // Los roles se configuran por negocio; el alcance local no concede acciones globales.
  const custom = (
    await request('post', `${base}/roles`, 1, 201, { nombre: ' Atención de flores y regalos ' })
  ).body;
  assert.equal(custom.nombre, 'Atención de flores y regalos');
  const customRole = `${base}/roles/${custom.id}`;
  await request('put', `${customRole}/permisos`, 1, 200, {
    permisos: ['negocio.editar', 'locales.gestionar'],
  });
  const assignment = (
    await request('post', `${worker}/roles`, 1, 201, { rol_id: custom.id, local_id: id(401) })
  ).body;
  await request('patch', base, 3, 403, { nombre: 'Fuera del alcance local' });
  await request('delete', `${worker}/roles/${assignment.id}`, 1, 200);
  const global = (
    await request('post', `${worker}/roles`, 1, 201, { rol_id: custom.id, local_id: null })
  ).body;
  const updated = await request('patch', base, 3, 200, { nombre: ' Flores, alimentos y regalos ' });
  assert.equal(updated.body.nombre, 'Flores, alimentos y regalos');
  assert.equal(updated.body.activo, true);
  await request('patch', base, 1, 200, { nombre: before.nombre });
  await request('patch', local, 3, 200, { nombre: 'Puesto configurable' });
  await request('patch', local, 1, 200, { nombre: 'Puesto A' });
  await request('patch', `${base}/locales/${id(402)}`, 3, 404, { nombre: 'No asignado' });
  await request('post', `${base}/locales`, 3, 403, { nombre: 'Alta reservada al propietario' });
  await request('post', `${base}/roles`, 3, 403, { nombre: 'Sin autorización' });
  // Desactivar un rol y vaciar sus permisos retira su efecto inmediatamente.
  await request('patch', customRole, 1, 200, { activo: false });
  await request('patch', base, 3, 403, { nombre: 'Rol desactivado' });
  await request('patch', customRole, 1, 200, { activo: true });
  await request('put', `${customRole}/permisos`, 1, 200, { permisos: [] });
  await request('patch', base, 3, 403, { nombre: 'Rol sin permisos' });
  await request('delete', `${worker}/roles/${global.id}`, 1, 200);
  await request('get', `${customRole}/permisos`, 1, 200);

  // Instantes inequívocos y campos anulables solo donde están definidos.
  const permission = { permiso_codigo: 'locales.ver', efecto: 'permitir', local_id: id(401) };
  for (const inicia_en of [null, '2030-01-01', '2030-01-01T12:00:00']) {
    await request('post', `${worker}/permisos`, 1, 400, { ...permission, inicia_en });
  }
  const grant = (
    await request('post', `${worker}/permisos`, 1, 201, {
      ...permission,
      inicia_en: '2020-01-01T00:00:00-05:00',
      vence_en: null,
      motivo: 'Temporal',
    })
  ).body;
  assert.equal(grant.inicia_en, '2020-01-01T05:00:00.000Z');
  for (const body of [
    {},
    { efecto: null },
    { inicia_en: null },
    { vence_en: '2030-01-01T12:00:00' },
  ]) {
    await request('patch', `${worker}/permisos/${grant.id}`, 1, 400, body);
  }
  const cleared = (
    await request('patch', `${worker}/permisos/${grant.id}`, 1, 200, {
      vence_en: null,
      motivo: null,
    })
  ).body;
  assert.equal(cleared.vence_en, null);
  assert.equal(cleared.motivo, null);
  await request('patch', `${worker}/permisos/${grant.id}`, 1, 409, {
    vence_en: '2019-01-01T00:00:00Z',
  });
  const deny = (
    await request('post', `${worker}/permisos`, 1, 201, { ...permission, efecto: 'denegar' })
  ).body;
  await request('get', local, 3, 403);
  await request('post', `${worker}/permisos/${deny.id}/revocar`, 1, 200);
  await request('get', local, 3, 200);
  await request('post', `${worker}/permisos/${grant.id}/revocar`, 1, 200);

  // Recorrer páginas no duplica filas ni revela si quedan registros no autorizados.
  const paths = [
    `${base}/locales`,
    `${base}/miembros`,
    `${base}/roles`,
    `${base}/auditoria`,
    `${worker}/roles`,
    `${worker}/locales`,
    `${worker}/permisos`,
    `${base}/invitaciones`,
    '/api/v1/me/negocios',
    '/api/v1/me/invitaciones',
    '/api/v1/plataforma/invitaciones-negocio',
  ];
  for (const path of paths) {
    const actor = path.startsWith('/api/v1/plataforma') ? 6 : 1;
    const limit = path.endsWith('/auditoria') ? 3 : 100;
    const complete = (await request('get', `${path}?limit=${limit}`, actor, 200)).body;
    const rows: unknown[] = [];
    for (let offset = 0; offset < Math.max(1, complete.items.length); offset++) {
      const part = (await request('get', `${path}?limit=1&offset=${offset}`, actor, 200)).body;
      assert.ok(part.items.length <= 1);
      assert.equal(part.has_more, offset + 1 < complete.items.length || complete.has_more);
      rows.push(...part.items);
      if (!part.has_more) break;
    }
    assert.deepEqual(rows, complete.items);
  }
  const ownerAccess = (await request('get', `${base}/acceso?limit=1`, 1, 200)).body;
  assert.equal(ownerAccess.locales.length, 1);
  assert.equal(ownerAccess.has_more, true);
  const workerAccess = (await request('get', `${base}/acceso?limit=1`, 3, 200)).body;
  assert.equal(workerAccess.locales.length, 1);
  assert.equal(workerAccess.has_more, false);
  const workerLocals = (await request('get', `${base}/locales?limit=1`, 3, 200)).body;
  assert.equal(workerLocals.has_more, false);
  assert.equal(workerLocals.items.length, 1);
}

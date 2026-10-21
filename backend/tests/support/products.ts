import assert from 'node:assert/strict';
import type { Client } from 'pg';
import type { testConfiguration } from './configuration.ts';

export async function testProducts(
  request: Parameters<typeof testConfiguration>[0],
  id: (n: number) => string,
  admin: Client,
) {
  const base = `/api/v1/negocios/${id(201)}`;
  const catalog = `${base}/productos`;
  const inventory = `${base}/locales/${id(401)}/inventario`;
  await request('get', catalog, undefined, 401);
  await request('get', catalog, 3, 403);
  await request('post', catalog, 3, 403, { nombre: 'Sin permiso' });
  for (const body of [
    {},
    { nombre: null },
    { nombre: ' ' },
    { nombre: 'x', negocio_id: id(202) },
    { nombre: 'x', precio: 18 },
    { nombre: 'x', costo: 'NaN' },
    { nombre: 'x', precio: '-1' },
    { nombre: 'x', precio: '1.001' },
    { nombre: 'x', activo: null },
  ])
    await request('post', catalog, 1, 400, body);
  const p = (await request('post', catalog, 1, 201, { nombre: ' Cuaderno azul ' })).body;
  assert.equal(p.nombre, 'Cuaderno azul');
  assert.equal(p.precio, null);
  assert.equal(p.costo, null);
  assert.equal(p.codigo, null);
  const url = `${catalog}/${p.id}`;
  const count = `${inventory}/${p.id}`;
  const updated = (
    await request('patch', url, 1, 200, {
      version: p.version,
      alias: 'Libreta',
      codigo: '000123',
      descripcion: 'Tapa azul',
      precio: '18.50',
      costo: null,
    })
  ).body;
  assert.equal(updated.precio, '18.50');
  assert.equal(updated.version, 2);
  await request('patch', url, 1, 409, { version: 1, nombre: 'Ficha vieja' });
  for (const body of [{ version: 2 }, { nombre: 'Sin versión' }, { version: 2, nombre: null }])
    await request('patch', url, 1, 400, body);
  assert.equal((await request('get', `${catalog}?q=libreta`, 1, 200)).body.items[0].id, p.id);
  assert.equal((await request('get', `${catalog}?q=000123`, 1, 200)).body.items[0].id, p.id);
  assert.equal((await request('get', `${catalog}?codigo=000123`, 1, 200)).body.items[0].id, p.id);
  assert.equal((await request('get', `${catalog}?codigo=Cuaderno`, 1, 200)).body.items.length, 0);
  assert.equal((await request('get', `${catalog}?q=%25`, 1, 200)).body.items.length, 0);
  const duplicate = await request('post', catalog, 1, 409, { nombre: 'Otro', codigo: ' 000123 ' });
  assert.equal(duplicate.body.error.code, 'CODIGO_PRODUCTO_DUPLICADO');
  const foreign = (
    await request('post', `/api/v1/negocios/${id(202)}/productos`, 4, 201, {
      nombre: 'Ajeno',
      codigo: '000123',
    })
  ).body;
  await request('get', `${catalog}/${foreign.id}`, 1, 404);
  await request('patch', `${catalog}/${foreign.id}`, 1, 404, { nombre: 'Intrusión', version: 1 });
  await request('get', catalog.replace(id(201), id(202)), 1, 403);
  assert.equal((await request('get', inventory, 1, 200)).body.items[0].estado, 'pendiente');
  assert.equal((await request('get', inventory, 1, 200)).body.items[0].cantidad, null);
  await request('post', `${count}/confirmar`, 1, 404, { version: 1, revision_fisica: true });
  for (const body of [
    { cantidad: -1, version: 0 },
    { cantidad: 1.5, version: 0 },
    { cantidad: null, version: 0 },
    { cantidad: 1, version: null },
    { cantidad: 1, version: 0, estado: 'confirmado' },
  ])
    await request('put', `${count}/conteo`, 1, 400, body);
  await request('put', `${inventory}/${foreign.id}/conteo`, 1, 404, { cantidad: 1, version: 0 });
  await request('get', inventory.replace(id(401), id(404)), 1, 404);
  const draft = (
    await request('put', `${count}/conteo`, 1, 200, {
      cantidad: 10,
      version: 0,
      referencia: ' Vitrina ',
    })
  ).body;
  assert.equal(draft.estado, 'preparacion');
  assert.equal(draft.referencia, 'Vitrina');
  assert.equal(draft.confirmado_en, null);
  await request('put', `${count}/conteo`, 1, 409, { cantidad: 99, version: 0 });
  const current = (
    await request('put', `${count}/conteo`, 1, 200, { cantidad: 9, version: draft.version })
  ).body;
  assert.equal(current.referencia, 'Vitrina');
  await request('post', `${count}/confirmar`, 1, 409, {
    version: draft.version,
    revision_fisica: true,
  });
  await request('post', `${count}/confirmar`, 1, 400, {
    version: current.version,
    revision_fisica: false,
  });
  const confirmed = (
    await request('post', `${count}/confirmar`, 1, 200, {
      version: current.version,
      revision_fisica: true,
    })
  ).body;
  assert.equal(confirmed.cantidad, 9);
  assert.equal(confirmed.confirmado_por, id(1));
  assert.ok(confirmed.confirmado_en);
  const retry = (
    await request('post', `${count}/confirmar`, 1, 200, {
      version: current.version,
      revision_fisica: true,
    })
  ).body;
  assert.deepEqual(retry, confirmed);
  await request('put', `${count}/conteo`, 1, 409, { cantidad: 20, version: confirmed.version });
  // El mismo producto se incorpora independientemente en el almacén, incluso con cero confirmado.
  const warehouseCount = count.replace(id(401), id(402));
  await request('put', `${warehouseCount}/conteo`, 1, 200, { cantidad: 0, version: 0 });
  await request('post', `${warehouseCount}/confirmar`, 1, 200, {
    version: 1,
    revision_fisica: true,
  });
  assert.equal(
    (await request('get', inventory.replace(id(401), id(402)), 1, 200)).body.items[0].cantidad,
    0,
  );
  // Las acciones locales no conceden acceso a otro local ni gestión de productos.
  const grants: string[] = [];
  for (const [permiso_codigo, local_id] of [
    ['productos.ver', null],
    ['inventario.contar', id(401)],
  ] as const) {
    const grant = (
      await request('post', `${base}/miembros/${id(303)}/permisos`, 1, 201, {
        permiso_codigo,
        local_id,
        efecto: 'permitir',
      })
    ).body;
    grants.push(grant.id);
  }
  await request('get', catalog, 3, 200);
  await request('post', catalog, 3, 403, { nombre: 'Sin gestión' });
  await request('get', inventory, 3, 200);
  await request('get', inventory.replace(id(401), id(402)), 3, 404);
  const second = (
    await request('post', catalog, 1, 201, { nombre: 'Borrador de equipo', precio: '0' })
  ).body;
  const secondCount = `${inventory}/${second.id}`;
  await request('put', `${secondCount}/conteo`, 3, 200, { cantidad: 5, version: 0 });
  await request('post', `${secondCount}/confirmar`, 3, 403, { version: 1, revision_fisica: true });
  const deny = (
    await request('post', `${base}/miembros/${id(303)}/permisos`, 1, 201, {
      permiso_codigo: 'inventario.contar',
      local_id: id(401),
      efecto: 'denegar',
    })
  ).body;
  await request('put', `${secondCount}/conteo`, 3, 403, { cantidad: 50, version: 1 });
  await request('post', `${base}/miembros/${id(303)}/permisos/${deny.id}/revocar`, 1, 200);
  // Dos dispositivos que parten del mismo borrador: solo uno puede guardar la siguiente versión.
  const races = await Promise.allSettled([
    request('put', `${secondCount}/conteo`, 1, 200, { cantidad: 6, version: 1 }),
    request('put', `${secondCount}/conteo`, 3, 200, { cantidad: 7, version: 1 }),
  ]);
  assert.equal(races.filter((r) => r.status === 'fulfilled').length, 1);
  const failed = races.find((r) => r.status === 'rejected');
  assert.ok(failed?.status === 'rejected' && String(failed.reason).includes('409'));
  const row = (await request('get', `${inventory}?q=Borrador`, 1, 200)).body.items[0];
  assert.equal(row.version, 2);
  assert.ok([6, 7].includes(row.cantidad));
  // Protección SQL directa, incluso si un futuro endpoint omitiese sus validaciones.
  await admin.query('begin; set local role vexor_runtime');
  try {
    await admin.query(
      "select set_config('vexor.actor_id',$1,true),set_config('vexor.negocio_id',$2,true)",
      [id(1), id(201)],
    );
    assert.equal(
      (await admin.query('select count(*)::int as n from app.productos where id=$1', [foreign.id]))
        .rows[0].n,
      0,
    );
    await admin.query('savepoint invalid_update');
    await assert.rejects(
      () =>
        admin.query(
          'update app.inventario_inicial set cantidad=100 where producto_id=$1 and local_id=$2',
          [p.id, id(401)],
        ),
      { code: '23514' },
    );
    await admin.query('rollback to savepoint invalid_update');
    await assert.rejects(
      () =>
        admin.query(
          'insert into app.inventario_inicial(negocio_id,local_id,producto_id,cantidad) values($1,$2,$3,1)',
          [id(201), id(401), foreign.id],
        ),
      { code: '23503' },
    );
  } finally {
    await admin.query('rollback');
  }
  const audit = await admin.query(
    "select tabla,operacion,nuevo from app.auditoria_acceso where negocio_id=$1 and tabla in ('productos','inventario_inicial')",
    [id(201)],
  );
  assert.ok(audit.rows.some((r) => r.tabla === 'productos'));
  assert.equal(
    audit.rows.filter(
      (r) =>
        r.tabla === 'inventario_inicial' &&
        r.nuevo.producto_id === p.id &&
        r.nuevo.local_id === id(401) &&
        r.nuevo.estado === 'confirmado',
    ).length,
    1,
  );
  for (const grantId of grants)
    await request('post', `${base}/miembros/${id(303)}/permisos/${grantId}/revocar`, 1, 200);
}

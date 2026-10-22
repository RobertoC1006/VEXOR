import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import type { Client } from 'pg';
import type { testConfiguration } from './configuration.ts';
export async function testVisualCatalog(
  request: Parameters<typeof testConfiguration>[0],
  id: (n: number) => string,
  admin: Client,
) {
  const base = `/api/v1/negocios/${id(201)}`,
    catalog = `${base}/productos`,
    inventory = `${base}/locales/${id(401)}/inventario`;
  const foto = `data:image/jpeg;base64,${(await readFile('backend/tests/fixtures/miniatura.jpg')).toString('base64')}`;
  for (const invalid of [
    'data:image/svg+xml;base64,PHN2Zz4=',
    'data:image/jpeg;base64,QUJDRA==',
    `data:image/jpeg;base64,${'A'.repeat(20000)}`,
  ])
    await request('post', catalog, 1, 400, { nombre: 'Foto inválida', foto: invalid });
  assert.equal((await request('get', `${catalog}?q=Foto+inválida`, 1, 200)).body.items.length, 0);
  const model = (
    await request('post', `${catalog}/registro`, 1, 201, {
      producto: { nombre: 'Modelo visual', nivel_registro: 'avanzado', codigo: 'VISUAL', foto },
      combinaciones: [
        { nombre: 'M rojo', precio: '10.00', caracteristicas: [{ nombre: 'Talla', valor: 'M' }] },
        { nombre: 'L rojo', precio: '12.00', caracteristicas: [{ nombre: 'Talla', valor: 'L' }] },
      ],
    })
  ).body;
  assert.equal(model.foto_version, 1);
  assert.equal((await request('get', `${catalog}/${model.id}/foto`, 1, 200)).body.imagen, foto);
  await request('get', `${catalog}/${model.id}/foto`, undefined, 401);
  await request('get', `${catalog}/${model.id}/foto`, 3, 403);
  await request('get', `/api/v1/negocios/${id(202)}/productos/${model.id}/foto`, 4, 404);
  const variants = (await request('get', `${catalog}/${model.id}/variantes`, 1, 200)).body.items;
  assert.equal(
    (await request('get', `${catalog}/${variants[0].id}/foto`, 1, 200)).body.imagen,
    foto,
  );
  await request('patch', `${catalog}/${variants[0].id}`, 1, 400, {
    version: variants[0].version,
    foto,
  });
  const stock = async () =>
    (await request('get', `${catalog}?codigo=VISUAL&local_id=${id(401)}`, 1, 200)).body.items[0];
  let row = await stock();
  assert.deepEqual(row.stock, { cantidad: null, confirmados: 0, total: 2, minimo: null, bajos: 0 });
  assert.equal(row.precio_min, '10.00');
  assert.equal(row.precio_max, '12.00');
  for (let i = 0; i < 2; i++) {
    await request('put', `${inventory}/${variants[i].id}/conteo`, 1, 200, {
      version: 0,
      cantidad: i === 0 ? 3 : 0,
    });
    await request('post', `${inventory}/${variants[i].id}/confirmar`, 1, 200, {
      version: 1,
      revision_fisica: true,
    });
    row = await stock();
    assert.equal(row.stock.confirmados, i + 1);
    assert.equal(row.stock.cantidad, i === 0 ? null : 3);
  }

  await request('patch', base, 3, 403, { descripcion: 'No autorizado' });
  await request('patch', base, 1, 400, { preferencias: { nivel_registro: 'inventado' } });
  await request('patch', base, 1, 400, { preferencias: { elementos_por_pagina: 50 } });
  await request('patch', base, 1, 400, { foto: 'data:image/jpeg;base64,QUJDRA==' });
  const profile = (
    await request('patch', base, 1, 200, {
      descripcion: 'Negocio de prueba',
      foto,
      preferencias: { nivel_registro: 'avanzado', ejes_variantes: ['Talla', 'Color'] },
    })
  ).body;
  assert.equal(profile.foto, foto);
  assert.equal(profile.descripcion, 'Negocio de prueba');
  const updatedProfile = (
    await request('patch', base, 1, 200, { preferencias: { elementos_por_pagina: 10 } })
  ).body;
  assert.equal(updatedProfile.preferencias.nivel_registro, 'avanzado');
  assert.equal(updatedProfile.preferencias.elementos_por_pagina, 10);
  for (const invalid of [0, -1, 1.2, '3'])
    await request('put', `${inventory}/${variants[0].id}/minimo`, 1, 400, {
      minimo: invalid,
      version: 0,
    });
  await request('put', `${inventory}/${variants[0].id}/minimo`, 3, 403, { minimo: 4, version: 0 });
  await request('put', `${inventory}/${model.id}/minimo`, 1, 404, { minimo: 4, version: 0 });
  await request('put', `${inventory}/${variants[0].id}/minimo`, 1, 200, { minimo: 4, version: 0 });
  await request('put', `${inventory}/${variants[0].id}/minimo`, 1, 409, { minimo: 5, version: 0 });
  row = await stock();
  assert.equal(row.stock.minimo, null);
  assert.equal(row.stock.bajos, 1);
  await request('put', `${inventory}/${variants[1].id}/minimo`, 1, 200, { minimo: 1, version: 0 });
  row = await stock();
  assert.equal(row.stock.minimo, 5);
  assert.equal(row.stock.bajos, 2);
  assert.equal(row.stock.cantidad, 3);
  await request('put', `${inventory}/${variants[0].id}/minimo`, 1, 200, {
    minimo: null,
    version: 1,
  });
  row = await stock();
  assert.equal(row.stock.minimo, null);
  assert.equal(row.stock.bajos, 1);
  const listing = (await request('get', `${inventory}?q=VISUAL`, 1, 200)).body.items;
  assert.equal(listing.length, 2);
  assert.ok(
    listing.every(
      (v: any) =>
        v.foto_version === 1 && v.modelo_nombre === 'Modelo visual' && v.precio !== undefined,
    ),
  );
  await admin.query('begin; set local role vexor_runtime');
  try {
    await admin.query(
      "select set_config('vexor.actor_id',$1,true),set_config('vexor.negocio_id',$2,true)",
      [id(4), id(202)],
    );
    assert.equal(
      (
        await admin.query('select count(*)::int n from app.productos_fotos where negocio_id=$1', [
          id(201),
        ])
      ).rows[0].n,
      0,
    );
    assert.equal(
      (
        await admin.query('select count(*)::int n from app.stock_minimos where negocio_id=$1', [
          id(201),
        ])
      ).rows[0].n,
      0,
    );
    assert.equal(
      (
        await admin.query('select count(*)::int n from app.negocio_perfil where negocio_id=$1', [
          id(201),
        ])
      ).rows[0].n,
      0,
    );
  } finally {
    await admin.query('rollback');
  }
  const changed = (
    await request('patch', `${catalog}/${model.id}`, 1, 200, { version: model.version, foto: null })
  ).body;
  assert.equal(changed.foto_version, 0);
  assert.equal((await request('get', `${catalog}/${model.id}/foto`, 1, 200)).body.imagen, null);
  await request('patch', `${catalog}/${model.id}`, 1, 409, { version: model.version, foto });
  assert.equal((await request('get', `${catalog}/${model.id}/foto`, 1, 200)).body.imagen, null);
  await request('get', `${catalog}?local_id=${id(9999)}`, 1, 404);
}

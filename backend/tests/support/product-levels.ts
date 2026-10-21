import assert from 'node:assert/strict';
import type { testConfiguration } from './configuration.ts';
export async function testProductLevels(
  request: Parameters<typeof testConfiguration>[0],
  id: (n: number) => string,
) {
  const base = `/api/v1/negocios/${id(201)}`;
  const catalog = `${base}/productos`;
  const inventory = `${base}/locales/${id(401)}/inventario`;
  for (const body of [
    { nivel_registro: 'lenceria' },
    { nivel_registro: null },
    { caracteristicas: null },
    { caracteristicas: { Talla: 'M' } },
    { caracteristicas: [{ nombre: 'Color', valor: 'Rojo', secreto: 'no' }] },
    { caracteristicas: [{ nombre: ' ', valor: 'Rojo' }] },
  ])
    await request('post', catalog, 1, 400, { nombre: 'Inválido', ...body });
  await request('post', catalog, 1, 409, {
    nombre: 'Duplicados',
    caracteristicas: [
      { nombre: 'Color', valor: 'Negro' },
      { nombre: 'color', valor: 'Rojo' },
    ],
  });
  const mid = (
    await request('post', catalog, 1, 201, {
      nombre: 'Cuaderno descriptivo',
      nivel_registro: 'intermedio',
      caracteristicas: [{ nombre: 'Marca', valor: ' Ejemplo ' }],
    })
  ).body;
  assert.deepEqual(mid.caracteristicas, [{ nombre: 'Marca', valor: 'Ejemplo' }]);
  await request('put', `${inventory}/${mid.id}/conteo`, 1, 200, { version: 0, cantidad: 10 });
  const blocked = await request('patch', `${catalog}/${mid.id}`, 1, 409, {
    version: mid.version,
    nivel_registro: 'avanzado',
  });
  assert.equal(blocked.body.error.code, 'PRODUCTO_CON_CONTEO');
  const parent = (
    await request('post', catalog, 1, 201, {
      nombre: 'Sostén modelo prueba',
      codigo: 'MODELO-PRUEBA',
      nivel_registro: 'avanzado',
      caracteristicas: [{ nombre: 'Marca', valor: 'Prueba' }],
    })
  ).body;
  const variants = `${catalog}/${parent.id}/variantes`;
  await request('post', variants, 3, 403, {
    nombre: 'Sin acceso',
    caracteristicas: [{ nombre: 'Talla', valor: '34' }],
  });
  const a = (
    await request('post', variants, 1, 201, {
      nombre: '34 B negro',
      codigo: 'VAR-34-B-N',
      caracteristicas: [
        { nombre: 'Talla', valor: '34' },
        { nombre: 'Copa', valor: 'B' },
        { nombre: 'Color', valor: 'Negro' },
      ],
    })
  ).body;
  const b = (
    await request('post', variants, 1, 201, {
      nombre: '36 B negro',
      caracteristicas: [
        { nombre: 'Talla', valor: '36' },
        { nombre: 'Copa', valor: 'B' },
        { nombre: 'Color', valor: 'Negro' },
      ],
    })
  ).body;
  assert.equal(a.producto_padre_id, parent.id);
  await request('post', variants, 1, 409, {
    nombre: 'Repetida con otro orden',
    caracteristicas: [
      { nombre: 'color', valor: 'negro' },
      { nombre: 'copa', valor: 'b' },
      { nombre: 'talla', valor: '34' },
    ],
  });
  await request('post', variants, 1, 409, {
    nombre: 'Código de modelo repetido',
    codigo: parent.codigo,
    caracteristicas: [{ nombre: 'Color', valor: 'Rojo' }],
  });
  await request('post', catalog, 1, 409, {
    nombre: 'Código de variante repetido',
    codigo: a.codigo,
  });
  await request('post', variants, 1, 409, { nombre: 'Sin combinación' });
  await request('post', `${catalog}/${a.id}/variantes`, 1, 404, {
    nombre: 'Anidada',
    caracteristicas: [{ nombre: 'Color', valor: 'Rojo' }],
  });
  await request('put', `${inventory}/${parent.id}/conteo`, 1, 409, { version: 0, cantidad: 7 });
  await request('patch', `${catalog}/${parent.id}`, 1, 409, {
    version: parent.version,
    nivel_registro: 'simple',
  });
  await request('put', `${inventory}/${a.id}/conteo`, 1, 200, { version: 0, cantidad: 4 });
  await request('post', `${inventory}/${a.id}/confirmar`, 1, 200, {
    version: 1,
    revision_fisica: true,
  });
  await request('put', `${inventory}/${b.id}/conteo`, 1, 200, { version: 0, cantidad: 3 });
  await request('post', `${inventory}/${b.id}/confirmar`, 1, 200, {
    version: 1,
    revision_fisica: true,
  });
  await request('patch', `${catalog}/${a.id}`, 1, 409, {
    version: a.version,
    caracteristicas: [{ nombre: 'Talla', valor: '99' }],
  });
  const rows = (await request('get', `${inventory}?q=Sostén`, 1, 200)).body.items;
  assert.equal(rows.length, 2);
  assert.equal(
    rows.reduce((total: number, r: any) => total + r.cantidad, 0),
    7,
  );
  assert.ok(
    rows.every(
      (r: any) => r.nombre_completo.startsWith(parent.nombre) && r.estado === 'confirmado',
    ),
  );
  const roots = (await request('get', `${catalog}?q=${a.codigo}`, 1, 200)).body.items;
  assert.equal(roots.length, 1);
  assert.equal(roots[0].id, parent.id);
  assert.equal((await request('get', `${variants}?limit=1`, 1, 200)).body.has_more, true);
  const foreign = (
    await request('post', `/api/v1/negocios/${id(202)}/productos`, 4, 201, {
      nombre: 'Modelo ajeno',
      nivel_registro: 'avanzado',
    })
  ).body;
  await request('get', `${catalog}/${foreign.id}/variantes`, 1, 404);
  await request('post', `${catalog}/${foreign.id}/variantes`, 1, 404, {
    nombre: 'Intrusión',
    caracteristicas: [{ nombre: 'Color', valor: 'Rojo' }],
  });
  await request('patch', `${catalog}/${a.id}`, 1, 400, {
    version: a.version,
    producto_padre_id: foreign.id,
  });
}

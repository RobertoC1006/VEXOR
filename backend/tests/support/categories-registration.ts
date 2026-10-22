import assert from 'node:assert/strict';
import type { Client } from 'pg';
import type { testConfiguration } from './configuration.ts';

export async function testCategoriesRegistration(
  request: Parameters<typeof testConfiguration>[0],
  id: (n: number) => string,
  admin: Client,
) {
  const base = `/api/v1/negocios/${id(201)}`,
    catalog = `${base}/productos`,
    categories = `${base}/categorias`;
  const inventory = `${base}/locales/${id(401)}/inventario`;
  await request('get', categories, undefined, 401);
  await request('get', categories, 3, 403);
  await request('post', categories, 3, 403, { nombre: 'Sin permiso' });
  for (const body of [
    {},
    { nombre: null },
    { nombre: ' ' },
    { nombre: 'Ropa', padre_id: 'invalido' },
    { nombre: 'Ropa', negocio_id: id(202) },
  ])
    await request('post', categories, 1, 400, body);
  const ropa = (await request('post', categories, 1, 201, { nombre: ' Ropa interior ' })).body;
  const mujer = (await request('post', categories, 1, 201, { nombre: 'Mujer', padre_id: ropa.id }))
    .body;
  const brasieres = (
    await request('post', categories, 1, 201, { nombre: 'Brasieres', padre_id: mujer.id })
  ).body;
  await request('post', categories, 1, 409, { nombre: 'ropa INTERIOR' });
  await request('post', categories, 1, 409, { nombre: 'mujer', padre_id: ropa.id });
  await request('post', categories, 1, 201, { nombre: 'Mujer' });
  const cycle = await request('patch', `${categories}/${ropa.id}`, 1, 409, {
    version: ropa.version,
    padre_id: brasieres.id,
  });
  assert.equal(cycle.body.error.code, 'CATEGORIA_CIRCULAR');
  await request('patch', `${categories}/${ropa.id}`, 1, 409, {
    version: ropa.version,
    padre_id: ropa.id,
  });
  await request('patch', `${categories}/${ropa.id}`, 1, 200, {
    version: ropa.version,
    nombre: 'Ropa y lencería',
  });
  await request('patch', `${categories}/${ropa.id}`, 1, 409, {
    version: ropa.version,
    nombre: 'Edición vieja',
  });
  await request('patch', `${categories}/${ropa.id}`, 1, 400, { version: 2 });
  const foreign = (
    await request('post', `/api/v1/negocios/${id(202)}/categorias`, 4, 201, { nombre: 'Ajena' })
  ).body;
  await request('post', categories, 1, 400, { nombre: 'Hija ajena', padre_id: foreign.id });
  await request('patch', `${categories}/${foreign.id}`, 1, 404, {
    version: 1,
    nombre: 'Intrusión',
  });
  const read = (await request('get', categories, 1, 200)).body.items;
  assert.ok(read.every((c: any) => c.negocio_id === id(201)));
  assert.ok(!read.some((c: any) => c.id === foreign.id));
  const grant = (
    await request('post', `${base}/miembros/${id(303)}/permisos`, 1, 201, {
      permiso_codigo: 'productos.ver',
      efecto: 'permitir',
    })
  ).body;
  await request('get', categories, 3, 200);
  await request('post', categories, 3, 403, { nombre: 'Sin gestión' });
  const body = {
    producto: {
      nombre: 'Modelo guiado',
      nivel_registro: 'avanzado',
      categoria_id: brasieres.id,
      caracteristicas: [{ nombre: 'Marca', valor: 'RAE' }],
      ejes_variantes: ['Talla', 'Color'],
    },
    combinaciones: [
      {
        nombre: '48 rojo',
        codigo: 'GUIADO-48-R',
        caracteristicas: [
          { nombre: 'Talla', valor: '48' },
          { nombre: 'Color', valor: 'Rojo' },
        ],
      },
      {
        nombre: '46 negro',
        codigo: 'GUIADO-46-N',
        caracteristicas: [
          { nombre: 'Talla', valor: '46' },
          { nombre: 'Color', valor: 'Negro' },
        ],
      },
    ],
  };
  await request('post', `${catalog}/registro`, 3, 403, body);
  await request('post', `${catalog}/registro`, 1, 400, { combinaciones: [] });
  await request('post', `${catalog}/registro`, 1, 400, {
    producto: { nombre: 'Inválido' },
    combinaciones: [body.combinaciones[0]],
  });
  const model = (await request('post', `${catalog}/registro`, 1, 201, body)).body;
  assert.equal(model.categoria_id, brasieres.id);
  assert.deepEqual(model.ejes_variantes, ['Talla', 'Color']);
  const combos = (await request('get', `${catalog}/${model.id}/variantes`, 1, 200)).body.items;
  assert.equal(combos.length, 2);
  const red = combos.find((c: any) => c.codigo === 'GUIADO-48-R');
  assert.equal(red.categoria_id, null);
  assert.equal(
    (await request('get', `${catalog}?categoria_id=${ropa.id}`, 1, 200)).body.items[0].id,
    model.id,
  );
  assert.equal(
    (await request('get', `${catalog}?categoria_id=${mujer.id}&codigo=GUIADO-48-R`, 1, 200)).body
      .items[0].id,
    model.id,
  );
  assert.equal(
    (await request('get', `${catalog}?categoria_id=${foreign.id}`, 1, 200)).body.items.length,
    0,
  );
  await request('put', `${inventory}/${red.id}/conteo`, 1, 200, { version: 0, cantidad: 6 });
  await request('post', `${inventory}/${red.id}/confirmar`, 1, 200, {
    version: 1,
    revision_fisica: true,
  });
  const saved = (
    await request('put', `${catalog}/${model.id}/registro`, 1, 200, {
      producto: { ...body.producto, nombre: 'Modelo guiado actualizado' },
      version: model.version,
      combinaciones: [
        { ...body.combinaciones[0], id: red.id, version: red.version, precio: '18.00' },
      ],
    })
  ).body;
  const kept = (await request('get', `${catalog}/${model.id}/variantes`, 1, 200)).body.items;
  assert.equal(kept.length, 2);
  assert.equal(kept.find((c: any) => c.id === red.id).precio, '18.00');
  await request('put', `${catalog}/${model.id}/registro`, 1, 409, {
    ...body,
    version: model.version,
    combinaciones: [],
  });
  const before = (await request('get', `${catalog}/${model.id}`, 1, 200)).body;
  await request('put', `${catalog}/${model.id}/registro`, 1, 409, {
    producto: { ...body.producto, nombre: 'No debe persistir' },
    version: saved.version,
    combinaciones: [
      {
        nombre: 'Nueva talla',
        id: red.id,
        version: 2,
        caracteristicas: [{ nombre: 'Talla', valor: '99' }],
      },
    ],
  });
  assert.deepEqual((await request('get', `${catalog}/${model.id}`, 1, 200)).body, before);
  assert.equal(
    (await request('get', `${inventory}?codigo=GUIADO-48-R`, 1, 200)).body.items[0].cantidad,
    6,
  );
  // Si una combinación falla, no queda una ficha parcial ni la primera fila insertada.
  await request('post', `${catalog}/registro`, 1, 409, {
    producto: { ...body.producto, nombre: 'Registro que debe revertirse' },
    combinaciones: [body.combinaciones[1]],
  });
  assert.equal(
    (await request('get', `${catalog}?q=Registro%20que%20debe%20revertirse`, 1, 200)).body.items
      .length,
    0,
  );
  await request('post', `${catalog}/registro`, 1, 400, {
    producto: { ...body.producto, categoria_id: foreign.id },
    combinaciones: [],
  });
  await request('put', `${catalog}/${model.id}/registro`, 1, 400, {
    producto: body.producto,
    version: saved.version,
    combinaciones: [
      { ...body.combinaciones[0], id: red.id, version: 2 },
      { ...body.combinaciones[0], id: red.id, version: 2 },
    ],
  });
  const other = (
    await request('post', catalog, 1, 201, {
      nombre: 'Modelo independiente',
      nivel_registro: 'avanzado',
    })
  ).body;
  await request('put', `${catalog}/${other.id}/registro`, 1, 404, {
    producto: body.producto,
    version: other.version,
    combinaciones: [{ ...body.combinaciones[0], id: red.id, version: 2 }],
  });
  assert.equal(
    (await request('get', `${catalog}/${other.id}`, 1, 200)).body.nombre,
    'Modelo independiente',
  );
  const legacy = (
    await request('post', catalog, 1, 201, {
      nombre: 'Modelo con descripción anterior',
      nivel_registro: 'avanzado',
      caracteristicas: [
        { nombre: 'Marca', valor: 'RAE' },
        { nombre: 'Talla', valor: '48' },
        { nombre: 'Color', valor: 'Rojo' },
      ],
    })
  ).body;
  const oldChild = (
    await request('post', `${catalog}/${legacy.id}/variantes`, 1, 201, {
      nombre: 'Combinación anterior 12',
      caracteristicas: [{ nombre: 'Talla', valor: '12' }],
    })
  ).body;
  await request('put', `${catalog}/${legacy.id}/registro`, 1, 200, {
    producto: {
      nombre: legacy.nombre,
      nivel_registro: 'avanzado',
      caracteristicas: [{ nombre: 'Marca', valor: 'RAE' }],
      ejes_variantes: ['Talla', 'Color'],
    },
    version: legacy.version,
    combinaciones: [
      {
        nombre: '48 rojo',
        caracteristicas: [
          { nombre: 'Talla', valor: '48' },
          { nombre: 'Color', valor: 'Rojo' },
        ],
      },
    ],
  });
  const migrated = (await request('get', `${catalog}/${legacy.id}/variantes`, 1, 200)).body.items;
  assert.equal(migrated.length, 2);
  assert.deepEqual(
    migrated.find((c: any) => c.id === oldChild.id),
    oldChild,
  );
  await admin.query('begin; set local role vexor_runtime');
  try {
    await admin.query(
      "select set_config('vexor.actor_id',$1,true),set_config('vexor.negocio_id',$2,true)",
      [id(1), id(201)],
    );
    assert.equal(
      (await admin.query('select count(*)::int as n from app.categorias where id=$1', [foreign.id]))
        .rows[0].n,
      0,
    );
  } finally {
    await admin.query('rollback');
  }
  assert.ok(
    (
      await admin.query(
        "select 1 from app.auditoria_acceso where tabla='categorias' and negocio_id=$1 limit 1",
        [id(201)],
      )
    ).rows.length,
  );
  await request('post', `${base}/miembros/${id(303)}/permisos/${grant.id}/revocar`, 1, 200);
}

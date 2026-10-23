import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { testConfiguration } from './configuration.ts';
import type { Client } from 'pg';
export async function testStockMovements(
  request: Parameters<typeof testConfiguration>[0],
  id: (n: number) => string,
  admin: Client,
) {
  const base = `/api/v1/negocios/${id(201)}`,
    local = id(401),
    dest = id(402);
  const product = (await request('post', `${base}/productos`, 1, 201, { nombre: 'Traslado QA' }))
    .body;
  const inv = (l: string) => `${base}/locales/${l}/inventario`;
  const ops = (l: string) => `${base}/locales/${l}`;
  for (const [l, n] of [
    [local, 20],
    [dest, 5],
  ] as const) {
    await request('put', `${inv(l)}/${product.id}/conteo`, 1, 200, { cantidad: n, version: 0 });
    await request('post', `${inv(l)}/${product.id}/confirmar`, 1, 200, {
      version: 1,
      revision_fisica: true,
    });
  }
  const balance = async (l: string) =>
    (await request('get', `${inv(l)}?producto_id=${product.id}`, 1, 200)).body.items[0].cantidad;
  const payload = {
    operacion_id: randomUUID(),
    producto_id: product.id,
    destino_id: dest,
    cantidad: 8,
    motivo: 'Reponer puesto',
    saldo_esperado: 20,
  };
  await request('post', `${ops(local)}/traslados`, 2, 403, payload);
  await request('post', `${ops(local)}/traslados`, 4, 403, payload);
  await request('post', `${ops(local)}/traslados`, 1, 400, { ...payload, cantidad: -2 });
  const sent = (await request('post', `${ops(local)}/traslados`, 1, 201, payload)).body;
  const retry = (await request('post', `${ops(local)}/traslados`, 1, 201, payload)).body;
  assert.equal(sent.id, retry.id);
  assert.equal(await balance(local), 12);
  assert.equal(await balance(dest), 5);
  await request('post', `${ops(local)}/traslados`, 1, 409, { ...payload, cantidad: 9 });
  await request('post', `${ops(local)}/traslados`, 1, 409, {
    ...payload,
    operacion_id: randomUUID(),
  });
  const receipt = {
    operacion_id: randomUUID(),
    traslado_id: sent.id,
    cantidad: 7,
    motivo: 'Llegaron 7; una unidad pendiente de entrega',
  };
  await request('post', `${ops(local)}/recepciones`, 1, 400, receipt);
  const received = (await request('post', `${ops(dest)}/recepciones`, 1, 201, receipt)).body;
  assert.equal(
    (await request('post', `${ops(dest)}/recepciones`, 1, 201, receipt)).body.id,
    received.id,
  );
  assert.equal(await balance(dest), 12);
  const transfers = (
    await request('get', `${ops(local)}/traslados?producto_id=${product.id}`, 1, 200)
  ).body.items;
  assert.equal(transfers[0].recibidas, 7);
  assert.equal(sent.cantidad - transfers[0].recibidas, 1);
  await request('post', `${ops(dest)}/recepciones`, 1, 409, {
    ...receipt,
    operacion_id: randomUUID(),
    cantidad: 2,
  });
  await request('post', `${ops(dest)}/recepciones`, 1, 201, {
    ...receipt,
    operacion_id: randomUUID(),
    cantidad: 1,
    motivo: 'Se entregó la unidad pendiente',
  });
  assert.equal((await balance(local)) + (await balance(dest)), 25);
  const adjustment = {
    operacion_id: randomUUID(),
    producto_id: product.id,
    cantidad: -1,
    saldo_esperado: 13,
    motivo: 'Unidad dañada detectada en revisión',
  };
  await request('post', `${ops(dest)}/ajustes`, 1, 201, adjustment);
  await request('post', `${ops(dest)}/ajustes`, 1, 201, adjustment);
  assert.equal(await balance(dest), 12);
  await request('post', `${ops(dest)}/ajustes`, 1, 409, {
    ...adjustment,
    operacion_id: randomUUID(),
    cantidad: -30,
    saldo_esperado: 12,
  });
  await request('post', `${ops(dest)}/ajustes`, 1, 400, {
    ...adjustment,
    operacion_id: randomUUID(),
    motivo: '',
  });
  const pending = (await request('post', `${base}/productos`, 1, 201, { nombre: 'Sin conteo QA' }))
    .body;
  await request('post', `${ops(dest)}/ajustes`, 1, 409, {
    ...adjustment,
    operacion_id: randomUUID(),
    producto_id: pending.id,
  });
  const detail = (await request('get', `${base}/inventario/productos/${product.id}`, 1, 200)).body;
  assert.equal(detail.existencias.find((s: any) => s.local_id === dest).cantidad, 12);
  await request('get', `${base}/inventario/productos/${product.id}`, 4, 403);
  const history = (
    await request('get', `${ops(dest)}/movimientos?producto_id=${product.id}&limit=5`, 1, 200)
  ).body;
  assert.equal(history.items.length, 3);
  assert.ok(history.items.every((m: any) => m.actor_id));
  const catalog = (
    await request('get', `${base}/productos?q=Traslado%20QA&local_id=${dest}`, 1, 200)
  ).body;
  assert.equal(catalog.items.find((p: any) => p.id === product.id).stock.cantidad, 12);
  assert.equal(
    (
      await admin.query(
        'select cantidad from app.inventario_inicial where negocio_id=$1 and local_id=$2 and producto_id=$3',
        [id(201), dest, product.id],
      )
    ).rows[0].cantidad,
    5,
  );
  // El observador del origen ve el estado completo del envío, sin el saldo del destino.
  for (const [permiso_codigo, local_id] of [
    ['productos.ver', null],
    ['inventario.ver', local],
  ] as const)
    await request('post', `${base}/miembros/${id(302)}/permisos`, 1, 201, {
      permiso_codigo,
      local_id,
      efecto: 'permitir',
    });
  const observed = (
    await request('get', `${ops(local)}/traslados?producto_id=${product.id}`, 2, 200)
  ).body;
  assert.equal(observed.items[0].recibidas, 8);
  const restricted = (await request('get', `${base}/inventario/productos/${product.id}`, 2, 200))
    .body;
  assert.ok(restricted.locales.every((l: any) => l.id === local));
  assert.ok(restricted.existencias.every((s: any) => s.local_id === local));
  await request('get', `${ops(dest)}/movimientos`, 2, 404);
  await request('put', `${inv(local)}/${pending.id}/minimo`, 1, 200, { minimo: 3, version: 0 });
  const uncounted = (
    await request('get', `${base}/inventario/productos/${pending.id}`, 1, 200)
  ).body.existencias.find((s: any) => s.local_id === local);
  assert.equal(uncounted.cantidad, null);
  assert.equal(uncounted.minimo, 3);
  // La cuenta SQL de aplicación no puede reescribir ni borrar el historial.
  for (const query of [
    'update app.stock_movimientos set cantidad=99',
    'delete from app.stock_movimientos',
  ]) {
    await admin.query('begin; set local role vexor_runtime');
    try {
      await admin.query(
        "select set_config('vexor.actor_id',$1,true),set_config('vexor.negocio_id',$2,true)",
        [id(1), id(201)],
      );
      await assert.rejects(
        () => admin.query(query),
        (e: any) => e.code === '42501',
      );
    } finally {
      await admin.query('rollback');
    }
  }
  // Las salidas simultáneas compiten por el mismo saldo; solo puede salir una.
  const results = await Promise.allSettled(
    [7, 7].map((cantidad) =>
      request('post', `${ops(local)}/traslados`, 1, 201, {
        ...payload,
        operacion_id: randomUUID(),
        cantidad,
        saldo_esperado: 12,
      }),
    ),
  );
  assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
  assert.ok(results.some((r) => r.status === 'rejected' && String(r.reason).includes('409')));
}

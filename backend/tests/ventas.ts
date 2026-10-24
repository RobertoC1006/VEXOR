import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { sql } from 'kysely';
import { startTestDatabase } from './support/postgres.ts';
import { createDatabase, withTenant } from '../src/compartido/database/database.ts';
import { startAuthServer } from './support/auth-server.ts';
import supertest from 'supertest';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const db = await startTestDatabase();
const runtime = createDatabase(db.url, 4);
const actor = randomUUID(),
  user = randomUUID(),
  negocio = randomUUID(),
  local = randomUUID(),
  producto = randomUUID();
const other = randomUUID(),
  worker = randomUUID(),
  workerUser = randomUUID();
const charge = (body: object, op = randomUUID(), who = actor, tenant = negocio) =>
  withTenant(
    runtime,
    { authUserId: who, negocioId: tenant },
    async (tx) =>
      (
        await sql<any>`select * from app_private.cobrar_venta(${tenant}::uuid,${local}::uuid,${op}::uuid,${JSON.stringify(body)}::jsonb)`.execute(
          tx,
        )
      ).rows[0],
  );
const body = (quantity = 1) => ({
  lineas: [
    { producto_id: producto, cantidad: quantity, unidades_esperadas: 1, precio_esperado: '18.00' },
  ],
  descuento: '0.00',
  pagos: { efectivo: (quantity * 18).toFixed(2), yape: '0', plin: '0' },
  efectivo_recibido: (quantity * 18 + 10).toFixed(2),
});
try {
  await db.admin.query('begin');
  await db.admin.query(`insert into auth.users(id) values($1),($2);`, [actor, worker]);
  await db.admin.query(
    `insert into app.usuarios(id,auth_user_id,nombre) values($1,$2,'Propietario'),($3,$4,'Vendedor');`,
    [user, actor, workerUser, worker],
  );
  await db.admin.query(
    `insert into app.negocios(id,nombre) values($1,'Ventas prueba'),($2,'Otro negocio');`,
    [negocio, other],
  );
  await db.admin.query(
    `insert into app.miembros_negocio(negocio_id,usuario_id,es_propietario) values($1,$2,true),($1,$3,false),($4,$2,true);`,
    [negocio, user, workerUser, other],
  );
  await db.admin.query(
    `insert into app.locales(id,negocio_id,nombre,habilitado_venta) values($1,$2,'Puesto',true);`,
    [local, negocio],
  );
  await db.admin.query(
    `insert into app.productos(id,negocio_id,nombre,precio) values($1,$2,'Artículo',18);`,
    [producto, negocio],
  );
  await db.admin.query(
    `select set_config('vexor.actor_id',$1,false),set_config('vexor.negocio_id',$2,false);`,
    [actor, negocio],
  );
  await db.admin.query(
    `insert into app.inventario_inicial(negocio_id,local_id,producto_id,cantidad) values($1,$2,$3,20);`,
    [negocio, local, producto],
  );
  await db.admin.query(
    `update app.inventario_inicial set estado='confirmado' where negocio_id=$1;`,
    [negocio],
  );
  await db.admin.query(
    'insert into app.stock_minimos(negocio_id,local_id,producto_id,minimo) values($1,$2,$3,5)',
    [negocio, local, producto],
  );
  await db.admin.query('commit');
  // Carritos compartidos: guardar/retomar no reserva ni mueve stock.
  const cp = randomUUID(),
    ca = randomUUID(),
    cb = randomUUID();
  await db.admin.query(
    "insert into app.productos(id,negocio_id,nombre,precio) values($1,$2,'Producto carritos',18)",
    [cp, negocio],
  );
  await db.admin.query(
    'insert into app.inventario_inicial(negocio_id,local_id,producto_id,cantidad) values($1,$2,$3,20)',
    [negocio, local, cp],
  );
  await db.admin.query(
    "update app.inventario_inicial set estado='confirmado' where negocio_id=$1 and producto_id=$2",
    [negocio, cp],
  );
  const content = (qty: number) => ({
    lineas: [{ producto_id: cp, cantidad: qty, unidades_esperadas: 1, precio_esperado: '18.00' }],
    descuento: '0.00',
  });
  const save = (id: string, version: number, qty: number, who = actor, n = negocio) =>
    withTenant(
      runtime,
      { authUserId: who, negocioId: n },
      async (tx) =>
        (
          await sql<any>`select * from app_private.guardar_carrito(${n}::uuid,${local}::uuid,${id}::uuid,${version},${'Carrito prueba'},${JSON.stringify(content(qty))}::jsonb)`.execute(
            tx,
          )
        ).rows[0],
    );
  const firstCart = await save(ca, 0, 12);
  await save(cb, 0, 12);
  assert.equal(firstCart.version, 1);
  assert.equal((await save(ca, 0, 12)).version, 1);
  assert.equal(
    (await db.admin.query('select cantidad from app.existencias where producto_id=$1', [cp]))
      .rows[0].cantidad,
    20,
  );
  const edited = await save(ca, 1, 2);
  assert.equal(edited.version, 2);
  assert.equal((await save(ca, 1, 2)).version, 2);
  await assert.rejects(save(ca, 1, 3));
  await assert.rejects(save(randomUUID(), 0, 1, worker));
  await assert.rejects(save(randomUUID(), 0, 1, actor, other));
  const cartSale = {
    ...content(2),
    pagos: { efectivo: '36.00', yape: '0.00', plin: '0.00' },
    efectivo_recibido: '40.00',
    carrito_id: ca,
    carrito_version: 2,
  };
  const cartOp = randomUUID();
  const sameCart = await Promise.allSettled([charge(cartSale, cartOp), charge(cartSale)]);
  assert.equal(sameCart.filter((r) => r.status === 'fulfilled').length, 1);
  const paid = (await db.admin.query('select * from app.ventas_carritos where id=$1', [ca]))
    .rows[0];
  assert.equal(paid.estado, 'completado');
  assert.ok(paid.venta_id);
  assert.equal(
    (await db.admin.query('select cantidad from app.existencias where producto_id=$1', [cp]))
      .rows[0].cantidad,
    18,
  );
  // Repetir la operación que ganó devuelve la misma venta aun con carrito completado.
  const stored = (
    await db.admin.query("select operacion_id from app.ventas where solicitud->>'carrito_id'=$1", [
      ca,
    ])
  ).rows[0];
  assert.equal((await charge(cartSale, stored.operacion_id)).id, paid.venta_id);
  await withTenant(runtime, { authUserId: actor, negocioId: negocio }, (tx) =>
    sql`select app_private.descartar_carrito(${negocio}::uuid,${cb}::uuid,1)`.execute(tx),
  );
  assert.equal(
    (await db.admin.query('select estado from app.ventas_carritos where id=$1', [cb])).rows[0]
      .estado,
    'descartado',
  );
  const op = randomUUID();
  const mixed = {
    ...body(3),
    descuento: '4',
    pagos: { efectivo: '10', yape: '25', plin: '15' },
    efectivo_recibido: '20',
  };
  const sale = await charge(mixed, op);
  assert.equal(sale.total, '50.00');
  assert.equal(sale.vuelto, '10.00');
  assert.equal((await charge(mixed, op)).id, sale.id);
  await assert.rejects(charge(body(), op));
  await assert.rejects(charge({ ...body(), pagos: { efectivo: '10', yape: '0', plin: '0' } }));
  await assert.rejects(charge(body(100)));
  await assert.rejects(
    charge({
      ...body(),
      lineas: [{ producto_id: producto, cantidad: 1, unidades_esperadas: 1, precio_esperado: '1' }],
    }),
  );
  await assert.rejects(charge(body(), randomUUID(), worker));
  await assert.rejects(charge(body(), randomUUID(), actor, other));
  const member = (
    await db.admin.query(
      'select id from app.miembros_negocio where negocio_id=$1 and usuario_id=$2',
      [negocio, workerUser],
    )
  ).rows[0].id;
  await db.admin.query(
    'insert into app.miembros_locales(negocio_id,miembro_id,local_id) values($1,$2,$3)',
    [negocio, member, local],
  );
  const ownerMember = (
    await db.admin.query(
      'select id from app.miembros_negocio where negocio_id=$1 and usuario_id=$2',
      [negocio, user],
    )
  ).rows[0].id;
  for (const permiso of ['ventas.cobrar', 'ventas.descontar'])
    await db.admin.query(
      `insert into app.permisos_otorgados(negocio_id,miembro_id,permiso_codigo,efecto,local_id,otorgante_id,motivo) values($1,$2,$3,'permitir',$4,$5,'Prueba de POS')`,
      [negocio, member, permiso, local, ownerMember],
    );
  await db.admin.query(
    'insert into app.ventas_politicas(negocio_id,limite_descuento) values($1,2)',
    [negocio],
  );
  await assert.rejects(charge(mixed, randomUUID(), worker));
  const stock = async () =>
    (await db.admin.query('select cantidad from app.existencias where negocio_id=$1', [negocio]))
      .rows[0].cantidad;
  assert.equal(await stock(), 17);
  await db.admin.query("update app.productos set codigo='SKU-1' where id=$1", [producto]);
  await assert.rejects(
    db.admin.query(
      "insert into app.presentaciones(negocio_id,producto_id,nombre,unidades,precio,codigo) values($1,$2,'Duplicada',12,180,'SKU-1')",
      [negocio, producto],
    ),
  );
  const presentation = randomUUID();
  await db.admin.query(
    `insert into app.presentaciones(id,negocio_id,producto_id,nombre,unidades,precio,codigo) values($1,$2,$3,'Docena',12,180,'PACK-1');`,
    [presentation, negocio, producto],
  );
  await charge({
    ...body(),
    lineas: [
      {
        producto_id: producto,
        presentacion_id: presentation,
        cantidad: 1,
        unidades_esperadas: 12,
        precio_esperado: '180',
      },
    ],
    pagos: { efectivo: '180', yape: '0', plin: '0' },
    efectivo_recibido: '200',
  });
  assert.equal(await stock(), 5);
  await assert.rejects(
    db.admin.query("update app.productos set codigo='PACK-1' where id=$1", [producto]),
  );
  await assert.rejects(
    charge({
      ...body(),
      lineas: [
        {
          producto_id: producto,
          presentacion_id: presentation,
          cantidad: 1,
          unidades_esperadas: 6,
          precio_esperado: '180',
        },
      ],
      pagos: { efectivo: '180', yape: '0', plin: '0' },
      efectivo_recibido: '180',
    }),
  );
  const contenders = await Promise.allSettled([charge(body(4)), charge(body(4))]);
  assert.equal(contenders.filter((r) => r.status === 'fulfilled').length, 1);
  assert.equal(await stock(), 1);
  await db.admin.query('update app.productos set precio=18 where id=$1', [producto]);
  const auth = await startAuthServer(db.admin, [
    { id: actor, email: 'pos@example.test' },
    { id: worker, email: 'seller@example.test' },
  ]);
  const { createApp } = await import(pathToFileURL(resolve('dist/backend/app.factory.js')).href);
  const app = await createApp(
    {
      databaseUrl: db.url,
      databasePoolMax: 2,
      supabaseUrl: auth.url,
      supabaseKey: 'test-publishable',
      supabaseSecretKey: 'test-secret',
      invitationRedirectUrl: 'http://localhost:5173/auth/callback',
      port: 0,
      host: '127.0.0.1',
      origins: ['http://localhost:5173'],
      production: false,
    },
    true,
  );
  try {
    await app.listen(0, '127.0.0.1');
    const http = supertest(app.getHttpServer()),
      token = await auth.token(actor),
      seller = await auth.token(worker),
      path = `/api/v1/negocios/${negocio}/ventas`;
    await http.get(`${path}/pos`).set('Authorization', `Bearer ${token}`).expect(200);
    const catalog = await http
      .get(`${path}/catalogo?local_id=${local}`)
      .set('Authorization', `Bearer ${seller}`)
      .expect(200);
    assert.equal(catalog.body.items[0].stock, 1);
    assert.equal(catalog.body.items[0].minimo, 5);
    const wa = randomUUID(),
      wb = randomUUID();
    const firstHeld = await http
      .put(`${path}/carritos/${wa}`)
      .set('Authorization', `Bearer ${seller}`)
      .send({ ...content(15), local_id: local, version: 0, nombre: 'Compra A' })
      .expect(200);
    assert.equal(firstHeld.body.version, 1);
    await http
      .put(`${path}/carritos/${wb}`)
      .set('Authorization', `Bearer ${seller}`)
      .send({ ...content(15), local_id: local, version: 0, nombre: 'Compra B' })
      .expect(200);
    const waits = await http
      .get(`${path}/carritos?local_id=${local}`)
      .set('Authorization', `Bearer ${seller}`)
      .expect(200);
    assert.equal(waits.body.total, 2);
    assert.equal(waits.body.demanda.find((d: any) => d.producto_id === cp).cantidad, '30');
    const excluded = await http
      .get(`${path}/carritos?local_id=${local}&excluir_id=${wa}`)
      .set('Authorization', `Bearer ${seller}`)
      .expect(200);
    assert.equal(excluded.body.demanda.find((d: any) => d.producto_id === cp).cantidad, '15');
    await http.get(`${path}/carritos/${wa}`).set('Authorization', `Bearer ${seller}`).expect(200);
    await http
      .put(`${path}/carritos/${wa}`)
      .set('Authorization', `Bearer ${seller}`)
      .send({ ...content(16), local_id: local, version: 1, nombre: 'Compra A' })
      .expect(200);
    await http
      .put(`${path}/carritos/${wa}`)
      .set('Authorization', `Bearer ${seller}`)
      .send({ ...content(17), local_id: local, version: 1, nombre: 'Compra A' })
      .expect(409);
    await http
      .post(`${path}/carritos/${wa}/descartar`)
      .set('Authorization', `Bearer ${seller}`)
      .send({ version: 2 })
      .expect(201);
    await http.get(`${path}/carritos/${wa}`).set('Authorization', `Bearer ${seller}`).expect(404);
    assert.equal(
      (await db.admin.query('select cantidad from app.existencias where producto_id=$1', [cp]))
        .rows[0].cantidad,
      18,
    );
    const scanned = await http
      .get(`${path}/catalogo?local_id=${local}&codigo=PACK-1`)
      .set('Authorization', `Bearer ${seller}`)
      .expect(200);
    assert.equal(scanned.body.items.length, 1);
    assert.equal(scanned.body.items[0].presentacion_escaneada, presentation);

    const access = await http
      .get(`/api/v1/negocios/${negocio}/acceso?limit=1`)
      .set('Authorization', `Bearer ${seller}`)
      .expect(200);
    assert.equal(
      access.body.acciones.find((p: any) => p.codigo === 'ventas.cobrar').permitido,
      true,
    );
    const denied = await http
      .get(`/api/v1/negocios/${other}/ventas?local_id=${local}`)
      .set('Authorization', `Bearer ${seller}`)
      .expect(403);
    assert.ok(denied.body.error);

    await http
      .post(path)
      .set('Authorization', `Bearer ${token}`)
      .send({ ...body(), operacion_id: randomUUID(), local_id: local, pagos: undefined })
      .expect(400);
    await http
      .post(path)
      .set('Authorization', `Bearer ${token}`)
      .send({
        ...body(),
        operacion_id: randomUUID(),
        local_id: local,
        pagos: { efectivo: '1', yape: '0', plin: '0' },
      })
      .expect(409);
    const charged = await http
      .post(path)
      .set('Authorization', `Bearer ${seller}`)
      .send({
        ...body(),
        operacion_id: randomUUID(),
        local_id: local,
        descuento: '2',
        pagos: { efectivo: '16', yape: '0', plin: '0' },
      })
      .expect(201);
    assert.equal(charged.body.total, '16.00');
    assert.equal(await stock(), 0);
    await http
      .put(`${path}/politica`)
      .set('Authorization', `Bearer ${seller}`)
      .send({ limite_descuento: '99' })
      .expect(403);
    const history = await http
      .get(`${path}?local_id=${local}`)
      .set('Authorization', `Bearer ${seller}`)
      .expect(200);
    assert.ok(history.body.items.some((s: any) => s.id === charged.body.id));
  } finally {
    await app.close();
    await auth.close();
  }
  assert.equal(
    (
      await db.admin.query('select cantidad from app.inventario_inicial where negocio_id=$1', [
        negocio,
      ])
    ).rows[0].cantidad,
    20,
  );
  await db.admin.query(`update app.productos set precio=null where id=$1`, [producto]);
  await assert.rejects(charge(body()));
  assert.equal(await stock(), 0);
  console.log(
    'Ventas OK: cobro mixto, vuelto, descuento, presentación, rollback, permisos, aislamiento, precio pendiente, idempotencia, carritos persistentes sin reserva y cobro único concurrente; conteo inicial intacto.',
  );
} finally {
  await runtime.destroy();
  await db.close();
}

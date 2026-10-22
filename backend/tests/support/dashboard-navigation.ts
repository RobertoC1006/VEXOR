import assert from 'node:assert/strict';
import type { testConfiguration } from './configuration.ts';
export async function testDashboardNavigation(
  request: Parameters<typeof testConfiguration>[0],
  id: (n: number) => string,
) {
  const base = `/api/v1/negocios/${id(201)}`,
    other = `/api/v1/negocios/${id(202)}`,
    inventory = `${base}/locales/${id(401)}/inventario`;
  const before = (await request('get', `${base}/resumen`, 1, 200)).body;
  await request('get', `${base}/resumen`, undefined, 401);
  await request('get', `${base}/resumen`, 4, 403);
  const denied = (await request('get', `${base}/resumen`, 3, 200)).body;
  assert.equal(denied.catalogo, null);
  assert.deepEqual(denied.locales, []);
  assert.deepEqual(denied.actividad, []);
  const model = (
    await request('post', `${base}/productos/registro`, 1, 201, {
      producto: { nombre: 'Modelo navegación QA', nivel_registro: 'avanzado' },
      combinaciones: Array.from({ length: 12 }, (_, i) => ({
        nombre: `Combinación ${String(i + 1).padStart(2, '0')}`,
        caracteristicas: [{ nombre: 'Talla', valor: String(i + 1) }],
      })),
    })
  ).body;
  await request('post', `${base}/productos`, 1, 201, { nombre: 'Otra ficha de navegación QA' });
  const variants = (
    await request('get', `${base}/productos/${model.id}/variantes?limit=100`, 1, 200)
  ).body.items;
  const target = variants[11];
  const all = (await request('get', `${inventory}?producto_id=${model.id}&limit=5`, 1, 200)).body;
  assert.equal(all.producto_filtrado.id, model.id);
  assert.equal(all.items.length, 5);
  assert.equal(all.has_more, true);
  assert.ok(all.items.every((p: any) => p.producto_padre_id === model.id));
  const last = (
    await request('get', `${inventory}?producto_id=${model.id}&offset=10&limit=5`, 1, 200)
  ).body;
  assert.equal(last.items.length, 2);
  assert.ok(last.items.some((p: any) => p.id === target.id));
  const exact = (await request('get', `${inventory}?producto_id=${target.id}`, 1, 200)).body;
  assert.equal(exact.items.length, 1);
  assert.equal(exact.items[0].id, target.id);
  assert.match(exact.producto_filtrado.nombre, /Modelo navegación QA/);
  const foreign = (
    await request('post', `${other}/productos`, 4, 201, { nombre: 'Solo negocio B QA' })
  ).body;
  await request('get', `${inventory}?producto_id=${foreign.id}`, 1, 404);
  await request('get', `${inventory}?producto_id=no-es-uuid`, 1, 400);
  await request('get', `${inventory}?estado_stock=inventado`, 1, 400);
  await request('put', `${inventory}/${target.id}/conteo`, 1, 200, { cantidad: 3, version: 0 });
  await request('post', `${inventory}/${target.id}/confirmar`, 1, 200, {
    version: 1,
    revision_fisica: true,
  });
  await request('put', `${inventory}/${target.id}/minimo`, 1, 200, { version: 0, minimo: 5 });
  const low = (
    await request('get', `${inventory}?producto_id=${model.id}&estado_stock=bajo`, 1, 200)
  ).body;
  assert.equal(low.items.length, 1);
  assert.equal(low.items[0].id, target.id);
  const pending = (
    await request(
      'get',
      `${inventory}?producto_id=${model.id}&estado_stock=pendiente&limit=100`,
      1,
      200,
    )
  ).body;
  assert.equal(pending.items.length, 11);
  assert.ok(!pending.items.some((p: any) => p.id === target.id));
  const after = (await request('get', `${base}/resumen`, 1, 200)).body;
  assert.equal(after.catalogo.productos, before.catalogo.productos + 2);
  assert.equal(after.catalogo.combinaciones, before.catalogo.combinaciones + 12);
  const local = after.locales.find((l: any) => l.id === id(401)),
    previous = before.locales.find((l: any) => l.id === id(401));
  assert.equal(local.confirmados, previous.confirmados + 1);
  assert.equal(local.unidades, previous.unidades + 3);
  assert.equal(local.alertas, previous.alertas + 1);
  assert.ok(
    after.actividad.some(
      (a: any) => a.tipo === 'conteo' && a.id === target.id && a.local_id === id(401),
    ),
  );
  const otherSummary = (await request('get', `${other}/resumen`, 4, 200)).body;
  assert.ok(!otherSummary.actividad.some((a: any) => a.id === model.id || a.id === target.id));
  assert.ok(!otherSummary.alertas.some((a: any) => a.id === target.id));
}

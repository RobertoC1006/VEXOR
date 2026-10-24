import { localDemoClient } from './demo-client.ts';
import { randomUUID } from 'node:crypto';
/** Seeds only the disposable local server started by demo-browser; never a remote URL. */
export async function seedStockDemo(base: string, token: string, businessId: string) {
  const request = localDemoClient(base, token, businessId);
  const locals = (await request('/locales?limit=100')).items;
  const warehouse = locals.find((l: any) => !l.habilitado_venta);
  const shop = locals.find((l: any) => l.habilitado_venta);
  if (!warehouse || !shop) throw new Error('La demo de stock necesita un puesto y un almacén');
  const category = await request('/categorias', {
    nombre: 'Ropa interior de dama',
    ejes_variantes: ['Talla', 'Color', 'Copa'],
  });
  for (const [index, name] of ['Brasier encaje', 'Brasier deportivo', 'Body clásico'].entries()) {
    const product = await request('/productos/registro', {
      producto: {
        nombre: name,
        categoria_id: category.id,
        nivel_registro: 'avanzado',
        caracteristicas: [
          { nombre: 'Marca', valor: 'Bella' },
          { nombre: 'Modelo', valor: `Demo ${index + 1}` },
        ],
        ejes_variantes: ['Talla', 'Color', 'Copa'],
      },
      combinaciones: ['Rosa', 'Negro', 'Beige'].flatMap((color) =>
        ['32', '34', '36'].map((talla) => ({
          nombre: `${talla}B · ${color}`,
          precio: '45.00',
          caracteristicas: [
            { nombre: 'Talla', valor: talla },
            { nombre: 'Copa', valor: 'B' },
            { nombre: 'Color', valor: color },
          ],
        })),
      ),
    });
    const variants = (await request(`/productos/${product.id}/variantes?limit=100`)).items;
    for (const [v, p] of variants.entries())
      for (const local of locals) {
        const count = local.habilitado_venta ? (v === 0 ? 4 : 12) : 20;
        const url = `/locales/${local.id}/inventario/${p.id}`;
        await request(`${url}/conteo`, { cantidad: count, version: 0 }, 'PUT');
        await request(`${url}/confirmar`, { version: 1, revision_fisica: true });
        await request(`${url}/minimo`, { version: 0, minimo: 5 }, 'PUT');
      }
    if (index === 0) {
      const sent = await request(`/locales/${warehouse.id}/traslados`, {
        operacion_id: randomUUID(),
        producto_id: variants[0].id,
        destino_id: shop.id,
        cantidad: 8,
        saldo_esperado: 20,
        motivo: 'Reponer el puesto desde el almacén',
      });
      await request(`/locales/${shop.id}/recepciones`, {
        operacion_id: randomUUID(),
        traslado_id: sent.id,
        cantidad: 7,
        motivo: 'Llegaron 7; una unidad sigue pendiente de entrega',
      });
    }
  }
  console.log('Demo de existencias: 3 modelos, 27 combinaciones, dos locales y recepción parcial.');
}

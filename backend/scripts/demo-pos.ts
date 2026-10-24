import { localDemoClient } from './demo-client.ts';
import { seedStockDemo } from './demo-stock.ts';
export async function seedPosDemo(base: string, token: string, businessId: string) {
  await seedStockDemo(base, token, businessId);
  const request = localDemoClient(base, token, businessId);
  const shop = (await request('/ventas/pos')).locales[0];
  for (const item of [
    { nombre: 'Cuaderno rayado', codigo: '000123', precio: '8.00', cantidad: 20 },
    { nombre: 'Lapicero azul', codigo: '000124', precio: '2.50', cantidad: 30 },
    { nombre: 'Artículo sin precio', codigo: '000125', precio: null, cantidad: 5 },
    { nombre: 'Artículo sin conteo', codigo: '000126', precio: '6.00', cantidad: null },
    { nombre: 'Artículo agotado', codigo: '000127', precio: '10.00', cantidad: 0 },
  ]) {
    const { cantidad, ...data } = item;
    const product = await request('/productos', data);
    if (cantidad !== null) {
      const url = `/locales/${shop.id}/inventario/${product.id}`;
      await request(`${url}/conteo`, { cantidad, version: 0 }, 'PUT');
      await request(`${url}/confirmar`, { version: 1, revision_fisica: true });
      await request(`${url}/minimo`, { version: 0, minimo: 5 }, 'PUT');
    }
    if (item.codigo === '000123')
      await request('/ventas/presentaciones', {
        producto_id: product.id,
        nombre: 'Docena',
        codigo: 'DOC-000123',
        unidades: 12,
        precio: '84.00',
      });
  }
  await request('/ventas/politica', { limite_descuento: '5.00' }, 'PUT');
  console.log(
    'Demo POS: códigos 000123–000127, docena con precio propio, casos sin precio/conteo/stock y límite de descuento S/5.',
  );
}

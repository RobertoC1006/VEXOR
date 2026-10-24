/** Only for disposable local fixtures, never a hosted business. */
export function localDemoClient(base: string, token: string, businessId: string) {
  if (new URL(base).hostname !== '127.0.0.1')
    throw new Error('La preparación de datos ficticios requiere la demo local');
  return async function request(path: string, body?: object, method = 'POST'): Promise<any> {
    const response = await fetch(`${base}/negocios/${businessId}${path}`, {
      method: body ? method : 'GET',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (!response.ok) throw new Error(`Falló preparar la demo: ${response.status} ${path}`);
    return response.json();
  };
}

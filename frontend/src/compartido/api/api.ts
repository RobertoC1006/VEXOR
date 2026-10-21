import { auth } from '../autenticacion/auth';
import type { Page } from '../tipos/types';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public requestId?: string,
    public code?: string,
  ) {
    super(message);
  }
}
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const { data, error } = await auth!.getSession();
  if (error || !data.session) {
    window.dispatchEvent(new Event('vexor:session-expired'));
    throw new ApiError(401, 'Tu sesión venció. Inicia sesión para continuar.');
  }
  let response: Response;
  try {
    response = await fetch(`/api/v1${path}`, {
      ...options,
      signal: options.signal ?? AbortSignal.timeout(20000),
      headers: {
        ...options.headers,
        Authorization: `Bearer ${data.session.access_token}`,
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      },
    });
  } catch {
    throw new ApiError(0, 'No pudimos conectar. Revisa tu conexión y vuelve a intentar.');
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    if (response.status === 401) window.dispatchEvent(new Event('vexor:session-expired'));
    const messages: Record<number, string> = {
      401: 'Tu sesión venció. Inicia sesión para continuar.',
      403: 'No tienes acceso a este negocio o a esta acción. Consulta con el propietario.',
      404: 'No encontramos este recurso. Puede que ya no esté disponible.',
      409: 'Los datos cambiaron o entran en conflicto con una regla del negocio. Actualiza y vuelve a intentar.',
      503: 'El servicio no está disponible por ahora. Vuelve a intentar en un momento.',
    };
    const knownErrors: Record<string, string> = {
      LIMITE_PUESTOS_ACTIVOS: 'El plan básico permite un solo puesto activo para venta.',
      NOMBRE_ROL_DUPLICADO: 'Ya existe un rol con ese nombre en este negocio.',
    };
    throw new ApiError(
      response.status,
      knownErrors[body?.error?.code] ??
        messages[response.status] ??
        'No se pudo completar la solicitud. Vuelve a intentar.',
      body?.requestId,
      body?.error?.code,
    );
  }
  return response.json() as Promise<T>;
}
export async function listAll<T>(path: string, signal?: AbortSignal): Promise<T[]> {
  const result: T[] = [];
  for (let offset = 0; offset <= 100000; offset += 100) {
    const page = await api<Page<T>>(`${path}?limit=100&offset=${offset}`, { signal });
    result.push(...page.items);
    if (page.has_more === false || (page.has_more === undefined && page.items.length < 100))
      return result;
  }
  throw new Error('La lista es demasiado extensa. Contacta con VEXOR.');
}

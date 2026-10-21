import { useReducer, useRef } from 'react';
import { api, ApiError } from '../api/api';

interface Pending<T> {
  key: string;
  body: T;
}
function read<T>(key: string): Pending<T> | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(key) ?? 'null');
    return value && typeof value.key === 'string' && value.body && typeof value.body === 'object'
      ? value
      : null;
  } catch {
    return null;
  }
}
export function useInvitationRequest<T extends object>(storageKey: string) {
  const request = useRef({ scope: storageKey, pending: read<T>(storageKey) });
  if (request.current.scope !== storageKey)
    request.current = { scope: storageKey, pending: read<T>(storageKey) };
  const [, render] = useReducer((value) => value + 1, 0);
  async function send<Result>(path: string, body: T): Promise<Result> {
    const pending = request.current.pending ?? { key: crypto.randomUUID(), body };
    sessionStorage.setItem(storageKey, JSON.stringify(pending));
    request.current.pending = pending;
    render();
    try {
      const result = await api<Result>(path, {
        method: 'POST',
        headers: { 'Idempotency-Key': pending.key },
        body: JSON.stringify(pending.body),
      });
      sessionStorage.removeItem(storageKey);
      request.current.pending = null;
      render();
      return result;
    } catch (error) {
      if (error instanceof ApiError && [400, 403, 404].includes(error.status)) {
        sessionStorage.removeItem(storageKey);
        request.current.pending = null;
        render();
      }
      throw error;
    }
  }
  return { pending: request.current.pending, send };
}

import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { useResource } from './use-resource';
afterEach(cleanup);

it('descarta una respuesta tardía del negocio anterior y cancela su solicitud', async () => {
  let resolveOld!: (value: string) => void;
  let oldSignal!: AbortSignal;
  const loadOld = (signal: AbortSignal) => {
    oldSignal = signal;
    return new Promise<string>((resolve) => {
      resolveOld = resolve;
    });
  };
  const { result, rerender } = renderHook(
    ({ key }) => useResource(key, key === 'A' ? loadOld : async () => 'Negocio B'),
    { initialProps: { key: 'A' } },
  );
  const oldRefresh = result.current.refresh;
  rerender({ key: 'B' });
  await waitFor(() => expect(result.current.data).toBe('Negocio B'));
  expect(oldSignal.aborted).toBe(true);
  await act(async () => {
    resolveOld('Datos privados A');
    await oldRefresh();
  });
  expect(result.current.data).toBe('Negocio B');
});

import { useCallback, useEffect, useRef, useState } from 'react';

export function useResource<T>(key: string, load: (signal: AbortSignal) => Promise<T>) {
  const loader = useRef(load);
  loader.current = load;
  const scope = useRef(key);
  scope.current = key;
  const request = useRef<AbortController | null>(null);
  const [state, setState] = useState<{
    key: string;
    data: T | null;
    error: Error | null;
    loading: boolean;
  }>({ key, data: null, error: null, loading: true });
  const refresh = useCallback(async () => {
    if (scope.current !== key) return null;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setState((previous) => ({ ...previous, key, error: null, loading: true }));
    try {
      const data = await loader.current(controller.signal);
      if (!controller.signal.aborted && scope.current === key)
        setState({ key, data, error: null, loading: false });
      return controller.signal.aborted ? null : data;
    } catch (error) {
      if (!controller.signal.aborted && scope.current === key)
        setState({ key, data: null, error: error as Error, loading: false });
      return null;
    }
  }, [key]);
  useEffect(() => {
    setState({ key, data: null, error: null, loading: true });
    void refresh();
    return () => request.current?.abort();
  }, [refresh]);
  return { ...(state.key === key ? state : { data: null, error: null, loading: true }), refresh };
}

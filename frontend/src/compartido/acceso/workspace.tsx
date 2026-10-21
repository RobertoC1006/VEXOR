import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { api, listAll } from '../api/api';
import type { Me, Business, Invitation } from '../tipos/types';
interface Workspace {
  me: Me;
  businesses: Business[];
  invitations: Invitation[];
}
const Context = createContext<{
  data: Workspace | null;
  error: Error | null;
  loading: boolean;
  reload: () => Promise<void>;
}>({ data: null, error: null, loading: true, reload: async () => {} });
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Workspace | null>(null),
    [error, setError] = useState<Error | null>(null),
    [loading, setLoading] = useState(true);
  const request = useRef<AbortController | null>(null);
  const reload = useCallback(async () => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setError(null);
    try {
      const [me, businesses, invitations] = await Promise.all([
        api<Me>('/me', { signal: controller.signal }),
        listAll<Business>('/me/negocios', controller.signal),
        listAll<Invitation>('/me/invitaciones', controller.signal),
      ]);
      if (!controller.signal.aborted) setData({ me, businesses, invitations });
    } catch (e) {
      if (!controller.signal.aborted) {
        setData(null);
        setError(e as Error);
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);
  useEffect(() => {
    void reload();
    return () => request.current?.abort();
  }, [reload]);
  return <Context.Provider value={{ data, error, loading, reload }}>{children}</Context.Provider>;
}
export const useWorkspace = () => useContext(Context);

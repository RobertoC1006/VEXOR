import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { listAll } from '../../compartido/api/api';
import { platformPath } from '../invitaciones/platform';
import type { PlatformInvitation } from '../invitaciones/types';
const Context = createContext<{
  invitations: PlatformInvitation[];
  loading: boolean;
  error: Error | null;
  reload: (quiet?: boolean) => Promise<void>;
}>({ invitations: [], loading: true, error: null, reload: async () => {} });
export function PlatformProvider({ children }: { children: ReactNode }) {
  const [invitations, setInvitations] = useState<PlatformInvitation[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState<Error | null>(null);
  const current = useRef<AbortController | null>(null);
  const reload = useCallback(async (quiet = false) => {
    current.current?.abort();
    const controller = new AbortController();
    current.current = controller;
    if (!quiet) setLoading(true);
    setError(null);
    try {
      const result = await listAll<PlatformInvitation>(platformPath, controller.signal);
      if (!controller.signal.aborted) setInvitations(result);
    } catch (e) {
      if (!controller.signal.aborted) {
        setInvitations([]);
        setError(e as Error);
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);
  useEffect(() => {
    void reload();
    return () => current.current?.abort();
  }, [reload]);
  return (
    <Context.Provider value={{ invitations, loading, error, reload }}>{children}</Context.Provider>
  );
}
export const usePlatform = () => useContext(Context);

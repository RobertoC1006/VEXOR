import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { auth } from './auth';
const Context = createContext<{
  session: Session | null;
  loading: boolean;
  expired: boolean;
  signOut: () => Promise<void>;
}>({ session: null, loading: true, expired: false, signOut: async () => {} });
export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null),
    [loading, setLoading] = useState(true),
    [expired, setExpired] = useState(false);
  const hadSession = useRef(false),
    leaving = useRef(false);
  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }
    let active = true;
    auth.getSession().then(({ data, error }) => {
      if (active) {
        hadSession.current = Boolean(data.session);
        setSession(error ? null : data.session);
        setLoading(false);
      }
    });
    const { data } = auth.onAuthStateChange((event, next) => {
      if (event === 'SIGNED_OUT' && hadSession.current && !leaving.current) setExpired(true);
      hadSession.current = Boolean(next);
      setSession(next);
      setLoading(false);
      if (event === 'SIGNED_IN') setExpired(false);
    });
    const expire = () => {
      setExpired(true);
      setSession(null);
      void auth!.signOut({ scope: 'local' });
    };
    window.addEventListener('vexor:session-expired', expire);
    return () => {
      active = false;
      data.subscription.unsubscribe();
      window.removeEventListener('vexor:session-expired', expire);
    };
  }, []);
  const signOut = async () => {
    leaving.current = true;
    try {
      const { error } = await auth!.signOut({ scope: 'local' });
      if (error) throw new Error('No pudimos cerrar la sesión. Vuelve a intentar.');
      sessionStorage.removeItem('vexor:password-pending');
      hadSession.current = false;
      setSession(null);
      setExpired(false);
    } finally {
      leaving.current = false;
    }
  };
  return (
    <Context.Provider value={{ session, loading, expired, signOut }}>{children}</Context.Provider>
  );
}
export const useSession = () => useContext(Context);

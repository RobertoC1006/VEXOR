import { useContext, useEffect, useRef, useState } from 'react';
import { ModalPendingContext } from '../componentes/modal';

export function useAction() {
  const trackPending = useContext(ModalPendingContext);
  const pending = useRef(false);
  const mounted = useRef(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  async function run(action: () => Promise<unknown>, success = 'Cambios guardados.') {
    if (pending.current) return false;
    pending.current = true;
    trackPending(1);
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await action();
      if (mounted.current) setMessage(success);
      return true;
    } catch (error) {
      if (mounted.current) setError((error as Error).message);
      return false;
    } finally {
      pending.current = false;
      trackPending(-1);
      if (mounted.current) setBusy(false);
    }
  }
  return { busy, error, message, run };
}

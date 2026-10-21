import { useEffect, useRef, useState } from 'react';

export function useAction() {
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
      if (mounted.current) setBusy(false);
    }
  }
  return { busy, error, message, run };
}

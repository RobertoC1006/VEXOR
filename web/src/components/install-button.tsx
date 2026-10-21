import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { Button } from './ui';
interface InstallPrompt extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
export function InstallButton() {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    const ready = (e: Event) => {
      e.preventDefault();
      setPrompt(e as InstallPrompt);
    };
    const installed = () => setPrompt(null);
    window.addEventListener('beforeinstallprompt', ready);
    window.addEventListener('appinstalled', installed);
    return () => {
      window.removeEventListener('beforeinstallprompt', ready);
      window.removeEventListener('appinstalled', installed);
    };
  }, []);
  if (!prompt) return null;
  return (
    <Button
      variant="secondary"
      aria-label="Instalar VEXOR"
      busy={busy}
      className="install-button"
      onClick={() => {
        setBusy(true);
        void prompt
          .prompt()
          .then(() => prompt.userChoice)
          .catch(() => {
            /* Browser dismissed its install prompt. */
          })
          .finally(() => {
            setBusy(false);
            setPrompt(null);
          });
      }}
    >
      <Download size={16} /> <span className="install-label">Instalar VEXOR</span>
    </Button>
  );
}

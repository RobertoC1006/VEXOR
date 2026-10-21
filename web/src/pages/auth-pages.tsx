import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Check, ShieldCheck, Store } from 'lucide-react';
import { auth, callbackUrl, configured, consumeCallback } from '../lib/auth';
import { Brand, Button, Field, PasswordField, Notice, Arrow, Loading } from '../components/ui';
import { useSession } from '../state/session';

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="auth-page">
      <header className="auth-top">
        <Brand />
        <span>Hecho para el ritmo de tu negocio.</span>
      </header>
      <main className="auth-card">
        <aside className="auth-story">
          <div className="story-art">
            <Store size={56} strokeWidth={1.25} />
            <span>Contigo, cada día.</span>
          </div>
          <div>
            <Brand />
            <h1>
              Tu negocio de mercado,
              <br />
              más simple.
            </h1>
            <p>
              Un espacio para tu negocio.
              <br />
              Un equipo que avanza contigo.
            </p>
          </div>
          <span className="story-foot">Pensado para los mercados del Perú</span>
        </aside>
        <section className="auth-form">{children}</section>
      </main>
      <footer className="auth-footer">
        <ShieldCheck size={15} /> Tu acceso es personal y seguro.
        <span>VEXOR © {new Date().getFullYear()}</span>
      </footer>
    </div>
  );
}
export function LoginPage() {
  const { session, expired } = useSession(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  if (session) return <Navigate to="/" replace />;
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const values = new FormData(e.currentTarget);
    setBusy(true);
    setError('');
    try {
      const { error } = await auth!.signInWithPassword({
        email: String(values.get('email')).trim(),
        password: String(values.get('password')),
      });
      if (error)
        setError(
          error.code === 'invalid_credentials'
            ? 'El correo o la contraseña no son correctos.'
            : error.code === 'email_not_confirmed'
              ? 'Confirma tu correo desde el enlace de invitación.'
              : 'No pudimos iniciar sesión. Revisa tu conexión e intenta de nuevo.',
        );
    } catch {
      setError('No pudimos conectar. Revisa tu conexión e intenta de nuevo.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <AuthLayout>
      <span className="eyebrow">BIENVENIDO A TU ESPACIO</span>
      <h2>Qué bueno verte de nuevo.</h2>
      <p className="muted">Ingresa a tu cuenta para continuar con tu negocio.</p>
      {expired && <Notice tone="info">Tu sesión venció. Inicia sesión para continuar.</Notice>}
      {!configured && <Notice>El acceso todavía no está configurado. Contacta con VEXOR.</Notice>}
      <form onSubmit={submit}>
        <Field
          label="Correo electrónico"
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          placeholder="tu@correo.com"
          required
          maxLength={254}
        />
        <PasswordField
          name="password"
          autoComplete="current-password"
          placeholder="Ingresa tu contraseña"
          required
        />
        <div className="form-options">
          <span>
            <ShieldCheck size={14} /> Acceso con invitación
          </span>
          <Link to="/recuperar">¿Olvidaste tu contraseña?</Link>
        </div>
        {error && <Notice>{error}</Notice>}
        <Button busy={busy} disabled={!configured} type="submit">
          Iniciar sesión <Arrow />
        </Button>
      </form>
      <div className="invite-help">
        <span className="icon-tile">
          <Store size={21} />
        </span>
        <div>
          <strong>¿Es tu primera vez en VEXOR?</strong>
          <p>Abre la invitación que recibiste por correo para activar tu acceso.</p>
        </div>
      </div>
    </AuthLayout>
  );
}
export function RecoveryPage() {
  const [busy, setBusy] = useState(false),
    [sent, setSent] = useState(false),
    [error, setError] = useState('');
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const email = String(new FormData(e.currentTarget).get('email')).trim();
    try {
      const { error } = await auth!.resetPasswordForEmail(email, { redirectTo: callbackUrl() });
      if (error) setError('No pudimos solicitar el enlace. Intenta de nuevo en un momento.');
      else setSent(true);
    } catch {
      setError('Revisa tu conexión y vuelve a intentar.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <AuthLayout>
      <span className="eyebrow">RECUPERA TU ACCESO</span>
      <h2>Volvamos a tu negocio.</h2>
      <p className="muted">Te enviaremos un enlace para establecer una nueva contraseña.</p>
      {sent ? (
        <Notice tone="success">
          Si existe una cuenta con ese correo, recibirás un enlace. Revisa también tu carpeta de
          spam.
        </Notice>
      ) : (
        <form onSubmit={submit}>
          <Field
            label="Correo electrónico"
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
          />
          {error && <Notice>{error}</Notice>}
          <Button busy={busy} disabled={!configured}>
            Enviar enlace <Arrow />
          </Button>
        </form>
      )}
      <Link className="back-link" to="/ingresar">
        Volver a iniciar sesión
      </Link>
    </AuthLayout>
  );
}
export function CallbackPage() {
  const navigate = useNavigate(),
    [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    consumeCallback()
      .then((next) => {
        if (active)
          navigate(next === 'password' ? '/establecer-contrasena' : '/invitaciones', {
            replace: true,
          });
      })
      .catch((e: Error) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [navigate]);
  return (
    <AuthLayout>
      {error ? (
        <>
          <h2>No pudimos abrir tu enlace.</h2>
          <Notice>{error}</Notice>
          <Link className="button primary" to="/recuperar">
            Recuperar acceso
          </Link>
          <Link className="back-link" to="/ingresar">
            Volver a iniciar sesión
          </Link>
        </>
      ) : (
        <Loading text="Validando tu invitación…" />
      )}
    </AuthLayout>
  );
}
export function PasswordPage() {
  const { session } = useSession(),
    navigate = useNavigate(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget),
      password = String(form.get('password'));
    setError('');
    if (password !== form.get('confirmation')) {
      setError('Las contraseñas deben coincidir.');
      return;
    }
    if (password.length < 12) {
      setError('Usa al menos 12 caracteres.');
      return;
    }
    setBusy(true);
    try {
      const { error } = await auth!.updateUser({ password });
      if (error)
        setError(
          'No pudimos guardar la contraseña. Comprueba los requisitos o solicita un nuevo enlace.',
        );
      else {
        sessionStorage.removeItem('vexor:password-pending');
        navigate('/invitaciones', { replace: true });
      }
    } catch {
      setError('Revisa tu conexión y vuelve a intentar.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <AuthLayout>
      <span className="eyebrow">UN PASO PARA EMPEZAR</span>
      <h2>Tu acceso, a tu manera.</h2>
      <p className="muted">
        Establece una contraseña para <strong>{session?.user.email}</strong>.
      </p>
      <form onSubmit={submit}>
        <PasswordField
          label="Nueva contraseña"
          name="password"
          minLength={12}
          maxLength={128}
          required
          autoComplete="new-password"
        />
        <span className="field-hint">
          <Check size={14} /> Al menos 12 caracteres. Combina palabras, números o símbolos.
        </span>
        <PasswordField
          label="Confirma tu contraseña"
          id="confirmation"
          name="confirmation"
          minLength={12}
          maxLength={128}
          required
          autoComplete="new-password"
        />
        {error && <Notice>{error}</Notice>}
        <Button busy={busy}>
          Guardar y continuar <Arrow />
        </Button>
      </form>
    </AuthLayout>
  );
}

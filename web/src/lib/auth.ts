import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const configured = Boolean(url && key);
// Invitations sent by the backend use implicit links, including across devices.
// We consume and erase the fragment explicitly before rendering anything else.
export const auth = configured
  ? createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        flowType: 'implicit',
      },
    }).auth
  : null;
export const callbackUrl = () => `${location.origin}/auth/callback`;

let callback: Promise<'password' | 'continue'> | undefined;
export function consumeCallback() {
  return (callback ??= readCallback());
}
async function readCallback(): Promise<'password' | 'continue'> {
  const query = new URLSearchParams(location.search),
    hash = new URLSearchParams(location.hash.slice(1));
  const code = query.get('code'),
    token = hash.get('access_token'),
    refresh = hash.get('refresh_token');
  const failed = query.has('error') || hash.has('error');
  const type = hash.get('type') ?? query.get('type');
  history.replaceState(null, '', '/auth/callback');
  if (!auth) throw new Error('El acceso todavía no está configurado. Contacta con VEXOR.');
  if (failed)
    throw new Error(
      'El enlace venció o ya fue utilizado. Solicita una nueva invitación o recupera tu acceso.',
    );
  if (code) {
    const { error } = await auth.exchangeCodeForSession(code);
    if (error)
      throw new Error('No pudimos validar el enlace en este dispositivo. Solicita uno nuevo.');
  } else if (token && refresh) {
    const { error } = await auth.setSession({ access_token: token, refresh_token: refresh });
    if (error) throw new Error('El enlace ya no es válido. Solicita uno nuevo.');
  } else
    throw new Error(
      'Este enlace está incompleto. Abre el enlace completo que recibiste por correo.',
    );
  const { data, error } = await auth.getUser();
  if (error || !data.user?.email_confirmed_at)
    throw new Error('No pudimos confirmar tu correo. Solicita un nuevo enlace.');
  const password = type === 'invite' || type === 'recovery';
  if (password) sessionStorage.setItem('vexor:password-pending', data.user.id);
  return password ? 'password' : 'continue';
}

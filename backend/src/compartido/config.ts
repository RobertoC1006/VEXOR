export interface AppConfig {
  databaseUrl: string;
  databasePoolMax: number;
  supabaseUrl: string;
  supabaseKey: string;
  supabaseSecretKey?: string;
  invitationRedirectUrl?: string;
  port: number;
  host: string;
  origins: string[];
  production: boolean;
}
export const CONFIG = Symbol('CONFIG');

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const required = (name: string) => {
    const value = env[name]?.trim();
    if (!value) throw new Error(`Falta la variable ${name}`);
    return value;
  };
  const production = env.NODE_ENV === 'production';
  const supabaseUrl = new URL(required('SUPABASE_URL'));
  if (
    supabaseUrl.protocol !== 'https:' &&
    (production || !['127.0.0.1', 'localhost', '[::1]'].includes(supabaseUrl.hostname))
  ) {
    throw new Error('SUPABASE_URL debe usar HTTPS');
  }
  const origins = (env.APP_ORIGINS ?? (production ? '' : 'http://localhost:5173'))
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
  if (!origins.length || origins.includes('*'))
    throw new Error('Configura APP_ORIGINS explícitamente');
  for (const origin of origins)
    if (new URL(origin).origin !== origin)
      throw new Error('APP_ORIGINS debe contener orígenes completos');
  const port = Number(env.PORT ?? 3000);
  const databasePoolMax = Number(env.DATABASE_POOL_MAX ?? 5);
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('PORT inválido');
  if (!Number.isInteger(databasePoolMax) || databasePoolMax < 1 || databasePoolMax > 20)
    throw new Error('DATABASE_POOL_MAX inválido');
  const databaseUrl = required('DATABASE_URL');
  if (!['postgres:', 'postgresql:'].includes(new URL(databaseUrl).protocol))
    throw new Error('DATABASE_URL inválida');
  if (env.INVITATION_REDIRECT_URL) {
    const redirect = new URL(env.INVITATION_REDIRECT_URL);
    if (!origins.includes(redirect.origin))
      throw new Error('INVITATION_REDIRECT_URL debe pertenecer a APP_ORIGINS');
  }
  return {
    databaseUrl,
    databasePoolMax,
    supabaseUrl: supabaseUrl.origin,
    supabaseKey: required('SUPABASE_PUBLISHABLE_KEY'),
    supabaseSecretKey: env.SUPABASE_SECRET_KEY,
    invitationRedirectUrl: env.INVITATION_REDIRECT_URL,
    port,
    host: env.HOST ?? '127.0.0.1',
    origins,
    production,
  };
}

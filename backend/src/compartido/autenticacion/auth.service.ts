import {
  Inject,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import { CONFIG, type AppConfig } from '../config.js';
import type { Actor } from '../database/database.service.js';

export const authOptions = {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  global: {
    fetch: (input: RequestInfo | URL, init?: RequestInit) =>
      fetch(input, { ...init, signal: AbortSignal.timeout(8000) }),
  },
};
@Injectable()
export class AuthService {
  private readonly client;
  constructor(@Inject(CONFIG) config: AppConfig) {
    this.client = createClient(config.supabaseUrl, config.supabaseKey, authOptions);
  }
  async verify(token: string): Promise<Actor> {
    const { data, error } = await this.client.auth.getUser(token);
    if (error) {
      if ((error.status ?? 0) >= 500 || error.name === 'AuthRetryableFetchError')
        throw new ServiceUnavailableException('Autenticación temporalmente no disponible');
      throw new UnauthorizedException('Sesión inválida o vencida');
    }
    const u = data.user;
    if (
      !u ||
      u.aud !== 'authenticated' ||
      u.role !== 'authenticated' ||
      !u.email ||
      !u.email_confirmed_at ||
      u.is_anonymous ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(u.id)
    )
      throw new UnauthorizedException('Se requiere una cuenta con correo confirmado');
    return Object.freeze({ authUserId: u.id, email: u.email.trim().toLowerCase() });
  }
}

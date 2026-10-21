import type { Request, Response } from 'express';
import { createApp } from '../dist/app.factory.js';
import { loadConfig } from '../dist/config.js';

// One Nest monolith per warm function. No second business layer in the PWA.
let handler: Promise<(req: Request, res: Response) => void> | undefined;
function initialize() {
  return (handler ??= (async () => {
    const app = await createApp(loadConfig(), true);
    try {
      await app.init();
    } catch (error) {
      await app.close();
      throw error;
    }
    return app.getHttpAdapter().getInstance();
  })().catch(() => {
    handler = undefined;
    throw new Error('Backend unavailable');
  }));
}
export default async function serve(req: Request, res: Response) {
  try {
    const handle = await initialize();
    handle(req, res);
  } catch {
    res.status(503).json({
      statusCode: 503,
      error: { code: 'NO_DISPONIBLE', message: 'Servicio temporalmente no disponible' },
    });
  }
}

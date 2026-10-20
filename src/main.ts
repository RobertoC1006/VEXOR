import { createApp } from './app.factory.js';
import { loadConfig } from './config.js';
import type { INestApplication } from '@nestjs/common';

let app:INestApplication|undefined;
try {
  const config=loadConfig();
  app=await createApp(config);
  await app.listen(config.port,config.host);
} catch(error) {
  // No imprimir configuración, claves ni URLs con credenciales.
  console.error('VEXOR no pudo iniciar. Comprueba las variables de entorno, las migraciones y la cuenta SQL restringida.');
  await app?.close();
  process.exitCode=1;
}

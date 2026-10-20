# VEXOR

SaaS para comerciantes de mercados peruanos. Monolito NestJS/TypeScript, PostgreSQL/Supabase y futura PWA React/Vite.

Están implementados la base de datos y el backend HTTP del núcleo. La PWA continúa en el siguiente bloque.

- [Diseño físico, seguridad, ejecución y pruebas](docs/diseno/NUCLEO_BASE_DATOS.md).
- [Migración inicial](supabase/migrations/20261020000100_nucleo.sql).
- [Resultados y evidencia del despliegue en Supabase](docs/verificacion/NUCLEO_2026-10-20.md).
- [Backend: endpoints, invitaciones y arranque](docs/diseno/BACKEND_NUCLEO.md).
- [Pruebas del backend y migración nueva](docs/verificacion/BACKEND_2026-10-20.md).
- [Contrato OpenAPI](docs/api/openapi.json).
- [Reglas y contexto del proyecto](docs/MEMORIA_PROYECTO.md).
- [Modelo global propuesto](docs/diseno/MODELO_DATOS_INICIAL.md).

```powershell
npm ci
npm run typecheck
npm run db:test
npm run db:test:postgres
npm run test:api
```

En Windows las pruebas usan PostgreSQL portátil; en otros sistemas, Docker. Puede elegirse `VEXOR_TEST_ENGINE=native` o `docker`. Las bases son desechables; las pruebas SQL de Supabase desarrollo se ejecutan en transacciones revertidas.

Para arrancar: completar `.env` con las variables de `.env.example`, configurar una cuenta SQL restringida, ejecutar `npm run build` y `npm start`. Swagger: `/docs` en desarrollo. No guardar credenciales en Git. La conexión remota, SMTP y el servicio Render requieren su configuración explícita; el código no los aprovisiona al arrancar.

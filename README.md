# VEXOR

SaaS para comerciantes de mercados peruanos. Monolito NestJS/TypeScript, PostgreSQL/Supabase y futura PWA React/Vite.

El primer bloque implementa la base de datos del núcleo. El backend HTTP y el frontend todavía no están implementados.

- [Diseño físico, seguridad, ejecución y pruebas](docs/diseno/NUCLEO_BASE_DATOS.md).
- [Migración inicial](supabase/migrations/20261020000100_nucleo.sql).
- [Resultados y evidencia del despliegue en Supabase](docs/verificacion/NUCLEO_2026-10-20.md).
- [Reglas y contexto del proyecto](docs/MEMORIA_PROYECTO.md).
- [Modelo global propuesto](docs/diseno/MODELO_DATOS_INICIAL.md).

```powershell
npm ci
npm run typecheck
npm run db:test
npm run db:test:postgres
```

La última orden necesita Docker. Las pruebas crean bases desechables; las de Supabase desarrollo se ejecutan en transacciones revertidas. No guardar credenciales en Git.

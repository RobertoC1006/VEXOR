# VEXOR

SaaS para comerciantes de mercados peruanos. Monolito NestJS/TypeScript, PostgreSQL/Supabase y PWA React/TypeScript/Vite.

Implementados: base de datos, backend del núcleo y primer frontend de acceso. La PWA incluye sesión, callback, contraseña y dos áreas separadas: **Administración de VEXOR**, con altas e invitaciones de negocios, y **Área de negocio**, con selección y dashboard comercial. Un administrador entra primero a `/plataforma` y cambia de área con la misma cuenta; un usuario comercial entra a `/negocios`. Ventas, inventario y sincronización offline corresponden a bloques posteriores.

- [Frontend, recorrido local y configuración de Vercel](docs/diseno/FRONTEND_NUCLEO.md).
- [Verificación del frontend y recorrido real](docs/verificacion/FRONTEND_2026-10-20.md).
- [Dos áreas y verificación de la administración de VEXOR](docs/verificacion/ADMINISTRACION_2026-10-20.md).

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
npm run test:web
```

En Windows las pruebas usan PostgreSQL portátil; en otros sistemas, Docker. Puede elegirse `VEXOR_TEST_ENGINE=native` o `docker`. Las bases son desechables; las pruebas SQL de Supabase desarrollo se ejecutan en transacciones revertidas.

Para trabajar con vexor-dev, conserva `.env` y `.env.runtime` existentes. **No vuelvas a aprovisionar la cuenta SQL.** En dos terminales:

```powershell
npm run dev:api
npm run dev:web
```

Abre `http://localhost:5173`. Swagger: `http://127.0.0.1:3000/docs` en desarrollo. `npm run build` compila el backend en `dist/` y la PWA de producción en `dist/web/`; `npm start` inicia únicamente el backend local.

El alojamiento acordado es **frontend en Vercel y backend en Render**, dentro del mismo repositorio y con un único monolito Nest. `vercel.json` compila solo la PWA y dirige `/api/v1/*` al servicio Render; `render.yaml` documenta el servicio Node. Solo Render recibe la conexión SQL restringida y la clave secreta Auth. Vercel recibe exclusivamente la URL y la clave pública Auth. SMTP personalizado requiere su proveedor y configuración en Supabase, no se aprovisiona al arrancar. Consulta la [guía de despliegue](docs/diseno/DESPLIEGUE_DEMO.md).

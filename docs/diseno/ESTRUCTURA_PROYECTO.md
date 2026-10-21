# Organización del repositorio

Estructura aprobada por el usuario: frontend y backend separados, cada uno con áreas de proveedor, comerciante y código compartido. Se conserva una PWA y un backend monolítico NestJS, con una base de datos y la autenticación existentes.

```text
VEXOR/
├── frontend/
│   ├── src/
│   │   ├── app/                         # Arranque React, rutas y estilos de entrada
│   │   ├── proveedor/
│   │   │   ├── inicio/paginas/
│   │   │   ├── negocios/paginas/
│   │   │   ├── invitaciones/            # Pantallas, componentes, tipos y lógica de altas
│   │   │   ├── componentes/
│   │   │   ├── estado/
│   │   │   └── estilos/
│   │   ├── comerciante/
│   │   │   ├── inicio/paginas/
│   │   │   ├── mis-negocios/
│   │   │   ├── negocio/                 # Tipos del contexto comercial
│   │   │   └── equipo/paginas/          # Aceptación de invitaciones actual
│   │   └── compartido/
│   │       ├── acceso/                  # Identidad, membresías y carga comunes
│   │       ├── autenticacion/
│   │       ├── componentes/
│   │       ├── layouts/
│   │       ├── api/
│   │       ├── estilos/
│   │       └── tipos/
│   ├── public/
│   ├── scripts/
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── vitest.config.ts
├── backend/
│   ├── src/
│   │   ├── main.ts
│   │   ├── app.factory.ts
│   │   ├── app.module.ts                # Composición del monolito
│   │   ├── proveedor/invitaciones/      # Altas de negocios por el proveedor
│   │   ├── comerciante/
│   │   │   ├── negocio/
│   │   │   ├── locales/
│   │   │   └── equipo/
│   │   └── compartido/
│   │       ├── autenticacion/
│   │       ├── autorizacion/
│   │       ├── invitaciones/
│   │       ├── database/                # Conexión, transacciones y tipos SQL
│   │       ├── http/
│   │       ├── salud/
│   │       └── config.ts
│   ├── supabase/
│   │   ├── migrations/                  # Mismas migraciones versionadas
│   │   ├── certs/                       # CA pública
│   │   └── config.toml
│   ├── tests/
│   │   ├── database/                    # Pruebas SQL
│   │   └── support/                     # PostgreSQL y Auth controlados
│   ├── scripts/
│   ├── tsconfig.json
│   └── tsconfig.build.json
├── docs/
├── .vscode/settings.json
├── AGENTS.md
├── README.md
├── package.json
├── package-lock.json
├── vercel.json
└── render.yaml
```

Las carpetas de funcionalidades se crean al necesitarlas. Las pantallas comerciales de edición de negocio, locales y equipo todavía pertenecen al siguiente paso: la reorganización ubica las pantallas ya existentes.

## Responsabilidades compartidas

- Controladores y DTO propios de cada área junto a su funcionalidad. Decoradores HTTP, validaciones, autorización y conexión SQL reutilizados desde `compartido/`.
- Identidad, sesión y descubrimiento de membresías comunes a una misma cuenta. El administrador de VEXOR necesita su propia membresía comercial para operar en un negocio.
- Altas del proveedor e invitaciones de equipo con controladores separados y un mismo mecanismo durable de envío y aceptación. Invitaciones personales de la cuenta autenticada en el área compartida.
- Componentes, layouts y clientes HTTP reutilizables del frontend compartidos; páginas separadas por área y funcionalidad. Las pruebas del frontend acompañan al código verificado.
- Las carpetas no conceden acceso: se conservan Bearer, autorización del servidor y RLS, junto con las mismas rutas HTTP y de navegación.

## Comandos y compilación

Ejecutar los comandos npm desde la raíz. Se conserva un solo `package.json` y lockfile, sin duplicar dependencias.

| Comando | Resultado |
| --- | --- |
| `npm run dev:web` | Vite usa `frontend/vite.config.ts`. |
| `npm run dev:api` | Compila y arranca el backend. |
| `npm run build` | Backend en `dist/backend/` y frontend en `dist/frontend/`. |
| `npm start` | Ejecuta `dist/backend/main.js`, cargando los archivos locales de entorno ignorados por Git. |
| `npm run typecheck` | Verifica backend, herramientas, pruebas y frontend. |
| `npm run test:web` | Vitest con su configuración dentro de `frontend/`. |
| `npm run test:api` | HTTP con PostgreSQL desechable y Auth controlado. |
| `npm run db:test` / `npm run db:test:postgres` | Pruebas SQL y migraciones de `backend/supabase/migrations/`. |
| `npm run test:client-build` | Paquete público compilado, iconos, manifest y exclusiones del worker. |

Supabase CLI debe usar `--workdir backend` para `link`, `db push`, `db reset` y operaciones sobre este proyecto local. Los scripts npm de migración y reset ya incluyen esa opción. La reorganización no ejecuta migraciones ni aprovisionamiento remoto.

`node_modules/`, `dist/` y `test-results/` son generados y no se versionan; `.vscode/settings.json` los oculta en exploradores compatibles con VS Code. Se conservan los archivos locales de entorno y los resultados existentes.

## Despliegue

Vercel mantiene la raíz y `npm run build:web`, con salida preparada en `dist/frontend`. `.vercelignore` excluye el backend. Render conserva la raíz y sus comandos npm: `build:api` produce `dist/backend` y `npm start` usa esa salida.

La ruta actual del certificado es `backend/supabase/certs/prod-ca-2021.crt`. El adaptador SQL normaliza la ruta relativa anterior `supabase/certs/prod-ca-2021.crt` para conservar la configuración instalada, manteniendo TLS con verificación. No se modifica ni se imprime ninguna credencial.

La configuración está preparada en la rama de trabajo. La demo desplegada continúa con la versión de `main` hasta aprobar e integrar su publicación.

## Verificación de la reorganización

- TypeScript de backend y frontend correcto; compilación de ambas salidas correcta.
- 216 comprobaciones HTTP/integración correctas, con la misma API y comprobación adicional de las rutas del certificado.
- 20 pruebas de frontend correctas.
- 71 comprobaciones del núcleo, 23 de invitaciones y limpieza del contexto correctas con las migraciones movidas.
- PostgreSQL nativo: las mismas comprobaciones, dos bajas concurrentes de propietarios, Kysely/pg, rollback y limpieza del pool correctos.
- Huellas Git de migraciones, SQL de pruebas, certificado público y recursos públicos idénticas a las anteriores. Se conservan todos los endpoints publicados; las tres consultas individuales del backend en revisión siguen disponibles.
- Paquete público sin secretos locales; manifest, iconos y service worker correctos.

Las bases y Auth de prueba son locales; no se envían correos reales ni se alteran los datos de Supabase. Los resultados se guardan en `test-results/`, ignorado por Git.

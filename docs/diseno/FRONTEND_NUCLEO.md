# Frontend del núcleo

20 de octubre de 2026. Rama `codex/frontend-nucleo`.

## Alcance

React, TypeScript y Vite en `frontend/`, dentro del repositorio del monolito. La presentación consume `/api/v1`; NestJS conserva la autorización y las reglas de negocio. Supabase Auth administra credenciales y sesiones. Las pantallas siguen las referencias claras/azules de VEXOR y se adaptan a escritorio, tablet y celular. La [estructura actual](ESTRUCTURA_PROYECTO.md) separa proveedor, comerciante y código compartido.

Rutas de acceso: `/ingresar`, `/recuperar`, `/auth/callback` y `/establecer-contrasena`. Rutas comerciales: `/negocios`, `/invitaciones` y `/negocios/:negocioId`. La administración del SaaS tiene `/plataforma`, `/plataforma/negocios`, `/plataforma/invitaciones` y `/plataforma/invitaciones/nueva`. `/` abre primero la administración de VEXOR si la identidad verificada tiene esa autorización; para el resto abre el área comercial. Las rutas desconocidas tienen una salida al inicio.

## Dos áreas con una identidad

La misma cuenta mantiene un correo y una contraseña. El shell comparte componentes, pero distingue navegación, título, rol mostrado y destino de inicio según el área. Solo una identidad que `/me` reconoce como administradora recibe el cambio entre áreas. Ser administrador del SaaS no concede propiedad ni acceso comercial implícitos.

`pages/area-routing.tsx` decide el inicio y protege la vista SaaS; el proveedor de datos de plataforma no se monta para una cuenta comercial. El backend sigue siendo la autoridad: todos los endpoints de plataforma vuelven a comprobar la administración, incluyendo si cambia durante una sesión.

La primera vista SaaS reutiliza el servicio de invitaciones existente: resumen de solicitudes, altas completadas, pendientes y errores de envío; listado de altas aceptadas; búsqueda/filtros de invitaciones; registro de una solicitud y acciones de reenvío/revocación con confirmación. No incorpora suscripciones, cobros, soporte, analítica ni acceso a los datos privados de otros negocios. “Negocios incorporados” muestra altas completadas por invitación, no un padrón general de negocios activos ni sus propietarios actuales.

El formulario revisa destinatario y negocio antes del envío. Una solicitud con resultado incierto conserva su contenido y su clave de idempotencia en `sessionStorage`, separada por identidad, para reintentar tras recargar sin crear otra solicitud. No guarda contraseñas. Una respuesta 202 puede contener un fallo de correo: la pantalla distingue solicitud guardada de correo aceptado por el proveedor. Una invitación ya aceptada no se cuenta como correo pendiente aunque su notificación hubiera fallado.

No se implementaron ventas, inventario, estadísticas comerciales, gestión del equipo, creación de locales ni sincronización offline. El dashboard muestra nombre y estado del negocio, vínculo propio, acciones efectivas y locales visibles obtenidos de la API. No simula ventas ni presenta importes ficticios. La administración de plataforma y la propiedad comercial siguen siendo accesos distintos.

## Componentes y estado

- `components/ui.tsx`: marca, botones, campos, contraseña visible/oculta, avisos, carga y vacíos.
- `components/layout.tsx`: shell, navegación compartida, cuenta, selector y menú móvil con teclado. Instalación se ofrece cuando el navegador la permite.
- `state/session.tsx`: sesión y eventos Auth; limpia las vistas protegidas al salir o recibir 401.
- `state/workspace.tsx`: perfil, todas las membresías y todas las invitaciones, recorriendo paginación. Cancela consultas obsoletas al desmontar o actualizar.
- `state/platform.tsx`: solicitudes de alta de la plataforma, paginación completa y actualización cancelable. Solo existe dentro del área SaaS autorizada.
- `lib/platform.ts` y `components/platform-invitations.tsx`: estados y presentación compartidos de las altas; los cambios ocurren mediante la API existente.
- `lib/api.ts`: Bearer, límites de espera, mensajes acotados y tratamiento diferenciado de 401/403. El identificador de negocio nunca sustituye la autorización del servidor.
- `lib/auth.ts`: procesamiento único del callback incluso bajo StrictMode. Elimina fragmento/query sensibles antes de resolver el enlace. Soporta enlaces implícitos de invitación/recuperación y códigos PKCE cuando existe su verificador.

Una invitación nueva o recuperación dirige a contraseña; un enlace de acceso de una identidad existente conserva su contraseña. La marca de contraseña pendiente es una ayuda de navegación local, no un control de autorización. La aceptación siempre ocurre por el endpoint protegido e idempotente del backend.

Hay estados de carga, error de red/servicio, sesión vencida, recurso ausente, acceso denegado y listas vacías. Los cambios de negocio no muestran el contexto anterior mientras carga el nuevo. El negocio se puede cambiar desde el dashboard; el servidor vuelve a comprobar su pertenencia. El acceso a locales es paginado.

## PWA

Manifest standalone, iconos PNG de 192/512, icono Apple, viewport con safe areas y navegación inferior móvil. Fuentes servidas localmente, sin llamadas a Google Fonts. Foto de mercado de [Unsplash](https://unsplash.com), utilizada únicamente como ambientación del acceso; no representa un negocio registrado.

En producción se registra `sw.js`. Su única caché contiene el aviso público `offline.html`; ante un fallo de navegación muestra ese aviso. **No guarda respuestas Auth, API, páginas autenticadas ni datos comerciales**, ni cola escrituras. `/auth/` y `/api/` quedan fuera de su interceptor. Esto no constituye trabajo ni sincronización offline del negocio. No se ha probado instalación en un teléfono físico.

## Desarrollo y pruebas

```powershell
npm ci
npm run dev:api
# Otra terminal:
npm run dev:web
```

El proxy de Vite dirige `/api` a `127.0.0.1:3000`. No se necesita copiar secretos a variables `VITE_`. Vite solo define explícitamente `SUPABASE_URL` y `SUPABASE_PUBLISHABLE_KEY`; la exposición automática de variables está desactivada. `build:web` fuerza `NODE_ENV=production` para que el `.env` de desarrollo del backend no genere React de desarrollo en la entrega.

```powershell
npm run typecheck
npm run build
npm run test:web
npm run test:api
npm run test:hosting
node --env-file=.env --env-file=.env.runtime --import tsx frontend/scripts/test-client-build.ts
```

`test:hosting` comprueba por HTTP un servidor ya iniciado; `VEXOR_SMOKE_ORIGIN` permite elegir el destino remoto sin mutaciones. Para repetir pruebas manuales sin alterar vexor-dev: `npm run demo:browser`; abre `http://localhost:5174`. El comando crea PostgreSQL desechable, Auth local con JWT firmados, el Nest real y otra instancia de Vite. Imprime credenciales **ficticias y exclusivamente locales**. Ctrl+C cierra esos procesos y la base de prueba. Nunca usar esas credenciales en Supabase.

## Configuración Auth y demo real

En vexor-dev quedaron configurados Site URL `http://localhost:5173` y redirect exacto `http://localhost:5173/auth/callback`. El primer administrador confirmó su identidad y estableció su contraseña personalmente; después se habilitó su administración explícita. Aceptó «Negocio demo VEXOR» desde la PWA y quedó como propietario.

`backend/scripts/setup-demo.ts` es una operación de desarrollo explícita: requiere `VEXOR_PROVISION_TARGET=development`, correo/nombre/negocio como argumentos, una identidad ya confirmada y las credenciales locales existentes. Registra al administrador y solicita la invitación por el mismo servicio del backend; conserva la idempotencia en `test-results/`. Nunca se ejecuta al iniciar HTTP o al desplegar. No crea ni modifica cuentas SQL.

SMTP personalizado está desactivado. El primer correo fue aceptado por el proveedor y el usuario completó el acceso; la notificación posterior de la invitación comercial devolvió `auth_rechazada`. La solicitud durable pudo aceptarse desde la sesión vigente. No se atribuye una causa más específica ni se afirma entrega SMTP general. Antes de invitar clientes externos hay que configurar un proveedor SMTP y validar entrega, recuperación y reenvíos.

## Vercel y Render

La instrucción actual del usuario separa el alojamiento: PWA estática en Vercel y monolito Nest en Render. La [guía de despliegue](DESPLIEGUE_DEMO.md) contiene la configuración vigente.

- Framework preset: Other; raíz: este repositorio; Node 22 o posterior compatible.
- Build Vercel: `npm run build:web`; salida pública: `dist/frontend`. Solo recibe las dos variables públicas de Auth.
- `/api/v1/*` se dirige mediante rewrite externo a Render; el resto de rutas de aplicación vuelve a `index.html`. Los archivos estáticos existentes se sirven directamente.
- Render compila `build:api` y ejecuta `npm start` con `HOST=0.0.0.0` y su `PORT`. Conserva RLS/autorización y la CA pública de Supabase. Se retiró el adaptador serverless de Vercel.
- Variables del servidor: `NODE_ENV=production`, `DATABASE_URL` de la cuenta restringida existente, `DATABASE_POOL_MAX` inicial bajo (por ejemplo 2), URL/clave pública Auth, `SUPABASE_SECRET_KEY`, `APP_ORIGINS` con el origen HTTPS exacto y `INVITATION_REDIRECT_URL` terminado en `/auth/callback`.
- Nunca subir `MIGRATION_DATABASE_URL`, `.env`, `.env.runtime`, claves SQL o contraseñas a la configuración pública. `.vercelignore` excluye secretos y resultados locales; el build se revisa buscando sus valores sin imprimirlos.
- Registrar el origen y callback definitivos en Supabase Auth al conocer el dominio. No abrir comodines para previews de terceros. La publicación del alojamiento corresponde al siguiente paso, después de la demo.

Las pruebas locales no certifican el enrutamiento, límites o funcionamiento de los alojamientos. Se verifica HTTP contra ambos destinos y el recorrido en navegador HTTPS. No se vuelve a aprovisionar la cuenta SQL.

Referencias técnicas: [Supabase Auth](https://supabase.com/docs/guides/auth/passwords), [redirects](https://supabase.com/docs/guides/auth/redirect-urls), [SMTP](https://supabase.com/docs/guides/auth/auth-smtp) y [funciones Node de Vercel](https://vercel.com/docs/functions/runtimes/node-js).

# EPIC 0 — Fundamentos: scaffolding y base de datos

Prerequisito técnico de todas las demás epics. Ver [`docs/architecture.md`](../architecture.md)
para la convención de carpetas y [`docs/data-model.md`](../data-model.md) para el detalle
completo del esquema.

---

### E0-1 — Scaffolding del proyecto Next.js + Supabase ✅ Hecho (2026-08-06)
- **Objetivo:** tener la base técnica lista para empezar a construir features.
- **Descripción:** `create-next-app` (App Router, TypeScript, Tailwind). Instalado el stack
  acordado: `@supabase/ssr`, `@supabase/supabase-js`, `zod`, `react-hook-form`,
  `@hookform/resolvers`, `server-only`, componentes shadcn base (button, input, label, card,
  dialog, table, select, checkbox, dropdown-menu). `.env.example` (Supabase + Mercado Pago),
  `.gitignore`.
  **Desvíos respecto del plan original** (el proyecto trae Next.js 16 / Tailwind v4 por
  defecto, más nuevo que `biblioteca-liliana-bodoc-web`/`salus-web`):
  - Tailwind v4 no usa `tailwind.config.ts` — el tema vive como variables CSS en
    `app/globals.css` (`@theme inline`), configurado por `shadcn init` con paleta neutra
    (preset `base-nova`, sin colores de marca todavía — no hay logo definido).
    `tailwindcss-animate` → `tw-animate-css` (equivalente para v4).
  - El CLI de shadcn actual usa `@base-ui/react` en vez de paquetes `@radix-ui/react-*`
    individuales (cambio de la librería en sí, no decisión propia).
  - No se corrió `supabase init` (CLI no instalado localmente): se creó `supabase/migrations/`
    a mano, mismo criterio que `biblioteca-liliana-bodoc-web` (que tampoco tiene
    `config.toml`). Se puede generar más adelante si hace falta trabajar con Supabase local.
  - `lucide-react` y `class-variance-authority`/`clsx`/`tailwind-merge` quedaron instalados por
    el propio `shadcn init`, no hubo que agregarlos aparte.
- **Depende de:** —
- **Archivos/módulos:** raíz del proyecto (`package.json`, `tsconfig.json`, `components.json`,
  `.env.example`, `.gitignore`), `supabase/migrations/`
- **Cambios de base de datos:** —
- **Criterios de aceptación:**
  - [x] `npm run build` compila sin errores (Next.js 16 usa Turbopack por defecto)
  - [ ] El proyecto de Supabase responde — pendiente de credenciales reales completas (ver nota
        al final de este documento)

---

### E0-2 — Estructura de carpetas ✅ Hecho (2026-08-06)
- **Objetivo:** dejar el esqueleto de `docs/architecture.md` listo antes de sumar features.
- **Descripción:** creados `app/`, `components/ui` (shadcn), `features/`, `repositories/`,
  `services/`, `hooks/`, `types/`, `lib/supabase/`, `supabase/migrations/`.
- **Depende de:** E0-1
- **Archivos/módulos:** estructura de carpetas nueva
- **Cambios de base de datos:** —
- **Criterios de aceptación:**
  - [x] La estructura coincide con `docs/architecture.md`

---

### E0-3 — Clientes de Supabase y proxy base ✅ Hecho (2026-08-06)
- **Objetivo:** acceso tipado a Supabase desde cliente y servidor, y el proxy de protección de
  rutas listo para que EPIC 1 lo complete.
- **Descripción:** `lib/supabase/client.ts`, `server.ts`, `proxy.ts`, `admin.ts` (mismo patrón
  que `biblioteca-liliana-bodoc-web`/`salus-web`). `proxy.ts` en la raíz del proyecto llama a
  `updateSession` (Next.js 16 renombró la convención "middleware" a "proxy" — `salus-web` ya
  usa este nombre). `types/database.ts` con un `Database` vacío (se completa a medida que se
  crean tablas en cada epic). `lib/env.ts` valida las variables de entorno al arrancar
  (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`,
  `MERCADOPAGO_ACCESS_TOKEN`, `MERCADOPAGO_WEBHOOK_SECRET`), importado desde `next.config.ts`.
- **Depende de:** E0-2
- **Archivos/módulos:** `lib/supabase/{client,server,proxy,admin}.ts`, `proxy.ts`, `lib/env.ts`,
  `types/database.ts`
- **Cambios de base de datos:** —
- **Criterios de aceptación:**
  - [x] Una Server Component puede leer `supabase.auth.getClaims()` sin error (verificado por
        `npm run build`, que ejercita `proxy.ts` en todas las rutas)

---

### E0-4 — Esquema `perfiles` y rol de usuario ✅ Hecho (2026-08-06)
- **Objetivo:** habilitar el concepto de usuario interno con rol — base de toda la
  autenticación/autorización del resto del sistema.
- **Descripción:** enum `rol_usuario` (`administrador` | `cajero`), tabla `perfiles` (ver
  `docs/data-model.md`), trigger `on_auth_user_created` que crea el perfil automáticamente al
  alta de un usuario en `auth.users` (default `cajero`), RLS "ver/editar mi propio perfil"
  habilitada desde el inicio (mismo patrón que `profiles` en `biblioteca-liliana-bodoc-web`).
  Aplicada con `npm run db:migrate` (`scripts/db/migrate.ts`, agregado en esta tarea junto con
  `pg`/`dotenv`/`tsx` — no hay CLI de Supabase instalado localmente, mismo criterio que
  `biblioteca-liliana-bodoc-web`).
- **Depende de:** E0-3
- **Archivos/módulos:** `supabase/migrations/20260806092724_create_perfiles_y_roles.sql`,
  `scripts/db/migrate.ts`, `types/database.ts`
- **Cambios de base de datos:** `create type rol_usuario`, `create table perfiles`, trigger
  `on_auth_user_created`
- **Criterios de aceptación:**
  - [x] Un alta en Supabase Auth crea automáticamente su fila en `perfiles` con rol `cajero`
        (verificado por el trigger + `createAdmin.ts` en E0-5, que depende de este
        comportamiento)

---

### E0-5 — Alta del primer administrador ✅ Hecho (2026-08-06)
- **Objetivo:** tener un usuario administrador real para poder entrar al sistema y probar el
  resto del backlog.
- **Descripción:** `scripts/db/createAdmin.ts <email> <password>` (mismo patrón que
  `biblioteca-liliana-bodoc-web`): crea el usuario vía Admin API de Supabase Auth
  (`SUPABASE_SECRET_KEY`) y sube su `perfiles.rol` a `administrador` (el trigger de E0-4 ya lo
  había creado con rol `cajero` por default). No hay UI para esto todavía (llega en
  `02-roles.md#E2-4`).
- **Depende de:** E0-4
- **Archivos/módulos:** `scripts/db/createAdmin.ts`
- **Cambios de base de datos:** `update perfiles set rol = 'administrador' where id = ...` (vía
  el script, no a mano)
- **Criterios de aceptación:**
  - [x] Existe al menos un `perfiles.rol = 'administrador'` para poder loguearse (verificado por
        consulta directa a la base tras correr el script)

---

### E0-6 — Esquema y seed de `configuracion_negocio` ✅ Hecho (2026-08-06)
- **Objetivo:** tener dónde guardar nombre/dirección/CUIT del comercio para imprimir en
  comprobantes y etiquetas.
- **Descripción:** tabla `configuracion_negocio` (fila única, ver `docs/data-model.md`), RLS con
  lectura abierta a cualquier usuario autenticado (la política de escritura, solo
  administrador, se agrega junto con la pantalla en `12-configuracion.md#E12-1`). Seed inicial:
  `nombre_comercial = 'Panadería Castillo'`; `direccion`/`telefono`/`cuit` quedaron `null` —
  todavía no se cargaron, se completan después desde esa misma pantalla.
- **Depende de:** E0-3
- **Archivos/módulos:**
  `supabase/migrations/20260806093454_create_configuracion_negocio.sql`,
  `types/database.ts`
- **Cambios de base de datos:** `create table configuracion_negocio`, insert de la fila inicial
- **Criterios de aceptación:**
  - [x] Existe exactamente una fila en `configuracion_negocio` con los datos del comercio

---

## Nota de estado (2026-08-06)

**EPIC 0 completo (E0-1 a E0-6).** `.env.local` tiene las credenciales reales de Supabase
(`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`,
`SUPABASE_DB_URL`). Hay un administrador real (`diegomartinfrsf@gmail.com`) y la fila de
`configuracion_negocio` con el nombre del comercio.

`MERCADOPAGO_ACCESS_TOKEN`/`MERCADOPAGO_WEBHOOK_SECRET` siguen en placeholder — no bloquean
nada hasta `08-mercadopago.md`. `direccion`/`telefono`/`cuit` de `configuracion_negocio`
quedaron sin cargar — se completan desde la pantalla de `12-configuracion.md#E12-1` cuando
exista.

Siguiente paso natural: EPIC 1 (autenticación) — ya hay perfil de administrador para probar el
login apenas exista la pantalla.

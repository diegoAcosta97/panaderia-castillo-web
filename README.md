<h1 align="center">Panadería Castillo</h1>

<p align="center">
  Sistema de gestión y punto de venta: catálogo, caja, ofertas y descuentos, ventas, Mercado
  Pago, comprobantes, etiquetas y control de stock.
</p>

## Sobre el proyecto

Aplicación de uso interno para el comercio (almacén + panadería, un solo local). No tiene
ninguna pantalla pública: todo el sistema arranca en `/login`. Dos roles: Administrador y
Cajero. No requiere sign-up público — el primer administrador se crea a mano (ver
[Puesta en marcha](#puesta-en-marcha)).

## Stack tecnológico

- **[Next.js 16](https://nextjs.org)** (App Router) + **React 19** + **TypeScript**
- **[Supabase](https://supabase.com)**: Postgres, Auth — RLS en cada tabla, funciones
  `SECURITY DEFINER` para operaciones atómicas (confirmar venta y descontar stock, generar
  etiquetas, aprobar ajustes de stock)
- **Tailwind CSS v4** + **shadcn/ui**
- **React Hook Form** + **Zod**
- **Mercado Pago** (QR dinámico + webhook)

## Arquitectura

Capas: `app/` (rutas, lo más delgado posible) → `features/*` (componentes, hooks, servicios por
dominio) → `repositories/*` (único lugar que conoce el esquema real de Supabase) →
`lib/supabase/*` (clientes `client`/`server`/`admin`, y `proxy.ts` para la protección de rutas).

Documentación completa:

| Documento | Contenido |
|---|---|
| [`docs/requisitos-funcionales.md`](docs/requisitos-funcionales.md) | Qué hace el sistema (RF-1 a RF-10) |
| [`docs/requisitos-no-funcionales.md`](docs/requisitos-no-funcionales.md) | Stack, seguridad, numeración de comprobante, moneda, concurrencia |
| [`docs/data-model.md`](docs/data-model.md) | Esquema de base de datos, enums, relaciones |
| [`docs/architecture.md`](docs/architecture.md) | Convención de carpetas, capas, reglas de dependencia |
| [`docs/backlog/`](docs/backlog/) | Backlog completo por épicas (`E{n}-{m}`), con criterios de aceptación |

## Puesta en marcha

### Requisitos

- Node.js 20+
- Un proyecto de [Supabase](https://supabase.com) (plan gratuito alcanza para desarrollo)
- Una cuenta de [Mercado Pago Developers](https://developers.mercadopago.com) (opcional hasta
  llegar a `08-mercadopago.md` — sin ella, todo lo anterior funciona igual)

### 1. Instalar

```bash
npm install
```

### 2. Variables de entorno

```bash
cp .env.example .env.local
```

Completar en `.env.local`:

| Variable | De dónde sale |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase → Project Settings → API |
| `SUPABASE_SECRET_KEY` | Supabase → Project Settings → API (¡nunca exponer al cliente!) |
| `SUPABASE_DB_URL` | Supabase → Project Settings → Database → Connection string (modo "Session") — solo la usan los scripts de migración |
| `MERCADOPAGO_ACCESS_TOKEN` | developers.mercadopago.com/panel/app |
| `MERCADOPAGO_WEBHOOK_SECRET` | developers.mercadopago.com/panel/app |

### 3. Aplicar las migraciones

```bash
npm run db:migrate
```

Corre cada archivo de `supabase/migrations/` una sola vez, en orden, contra `SUPABASE_DB_URL`
(lleva registro de lo ya aplicado en `public._migrations`).

### 4. Crear el primer administrador

No hay sign-up público — se crea a mano:

```bash
npx tsx scripts/db/createAdmin.ts admin@ejemplo.com "una-contraseña-segura"
```

### 5. Levantar el entorno de desarrollo

```bash
npm run dev
```

Todo el sistema requiere sesión — abrir [http://localhost:3000](http://localhost:3000) redirige
a `/login`.

## Scripts disponibles

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run start` | Sirve el build de producción |
| `npm run lint` | ESLint |
| `npm run db:migrate` | Aplica migraciones pendientes de `supabase/migrations/` |
| `npx tsx scripts/db/createAdmin.ts <email> <password>` | Crea un usuario administrador |

## Despliegue

Pensado para [Vercel](https://vercel.com). Configurar las mismas variables de entorno del paso
2 en el proyecto de Vercel, y aplicar las migraciones contra la base de producción antes del
primer deploy.

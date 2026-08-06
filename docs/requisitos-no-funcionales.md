# Requisitos no funcionales

## Stack tecnológico

Mismo stack que `biblioteca-liliana-bodoc-web` y `salus-web`, para reutilizar convenciones y
código:

- **Next.js** (App Router) + **TypeScript**, deploy en **Vercel**.
- **Supabase** (Postgres + Auth + RLS) como backend. Sin ORM: repositories tipados a mano
  contra el cliente de Supabase (`@supabase/ssr`, `@supabase/supabase-js`), como en ambos
  proyectos de referencia.
- **Tailwind CSS** + componentes shadcn/radix (`components/ui`).
- **Zod** + **react-hook-form** para validación de formularios.
- **Mercado Pago SDK** (server-side) para generación de QR/preferencias y verificación de
  webhooks.
- Generación de código de barras **on-the-fly** (sin persistir imágenes) con `jsbarcode`
  (SVG/canvas, cliente), mismo patrón que el QR de libros en `biblioteca-liliana-bodoc-web`
  (`lib/qr.ts`).
- Impresión de etiquetas y comprobante: `window.print()` + CSS `@media print` (sin librería de
  PDF en servidor), mismo patrón sin dependencias nuevas que ya usa `biblioteca-liliana-bodoc-web`
  para etiquetas de libros. El diálogo "Guardar como PDF" del navegador cubre el requisito de
  comprobante descargable en PDF (RF-4.7). Se reevalúa una librería de PDF en servidor (ej.
  `@react-pdf/renderer`) si más adelante hace falta generar el archivo sin intervención del
  usuario (ej. adjuntarlo a un envío automático).

## Seguridad

- Autenticación con Supabase Auth (usuario/contraseña). Sin registro público: los usuarios
  (administrador/cajero) los da de alta el administrador.
- **No hay ninguna pantalla pública**: la aplicación entera arranca en `/login`. Sin sesión,
  cualquier ruta redirige ahí; con sesión, se entra directo al POS o al panel según el rol (ver
  detalle en `docs/architecture.md`).
- **Caducidad de sesión: 1 hora de inactividad.** El objetivo es evitar sesiones abiertas
  indefinidamente en la terminal del local (ej. alguien se olvida de cerrar sesión al final de
  su turno). Se implementa como *idle timeout* en el cliente (se cierra sesión sola tras 60
  minutos sin interacción del usuario — mouse/teclado/touch), no como límite absoluto de vida de
  la sesión: un cajero que está usando el sistema de forma continua durante todo su turno no
  debería ser deslogueado a mitad de una venta. El cierre de sesión por inactividad **no** afecta
  el turno de caja abierto (son estados independientes — la caja se cierra explícitamente por
  RF-5.4, no por el logout).
- Row Level Security en todas las tablas sensibles (ventas, caja, stock, gastos). El rol
  (`administrador` | `cajero`) se resuelve consultando la tabla de perfiles server-side, igual
  que en `salus-web` (sin JWT custom claims).
- El cajero no debe poder, ni por UI ni por policy de RLS, anular ventas, aprobar ajustes de
  stock, ni modificar precios/ofertas/descuentos.
- El webhook de Mercado Pago se valida (firma/secret) antes de confirmar cualquier pago —
  nunca se confía en un estado de pago que llegue solo desde el cliente.

## Integridad de datos y auditoría

- Todo movimiento de stock (venta, anulación, generación de etiquetas, ajuste por control de
  stock, ajuste manual) queda registrado en un histórico (no solo se pisa el valor de stock
  actual), para poder reconstruir "por qué" el stock quedó en un valor dado.
- Los precios, ofertas y descuentos aplicados a una venta se **guardan como snapshot** en el
  momento de la venta (no como referencia viva al producto/oferta/descuento), para que el
  comprobante histórico no cambie si después se edita un precio.
- El cierre de caja (arqueo) y sus diferencias quedan guardados de forma inmutable una vez
  cerrado el turno.

## Numeración de comprobantes (pensando en AFIP futuro)

- La numeración de venta es un **correlativo único que nunca se reinicia** (no por turno
  calendario, sino por punto de venta — hoy hay un solo punto de venta), tal como exige después
  la numeración de comprobantes de AFIP. Esto evita tener que rediseñar la numeración cuando se
  integre facturación electrónica.
- No se agregan todavía campos específicos de AFIP (tipo de comprobante A/B/C, CUIT del cliente,
  CAE, etc.) porque no está en el alcance de esta iteración — pero el detalle de la venta
  (productos, cantidades, precios, medios de pago) ya tiene la granularidad que esa integración
  va a necesitar.

## Moneda y precisión numérica

- Moneda única: ARS.
- Montos de dinero: 2 decimales.
- Peso (productos vendidos por kg): hasta 3 decimales (gramos).

## Disponibilidad y uso en el local

- El punto de venta es de uso interno, en el local, no de cara al público (no hay tienda online
  en esta iteración).
- Debe funcionar de forma fluida con conexión a internet estándar de un comercio; no se
  contempla modo offline en esta iteración (Mercado Pago y Supabase requieren conexión de todos
  modos).
- La pantalla de venta debe permitir operar mayormente con el lector de código de barras y
  teclado, minimizando clics, para no ralentizar la atención al cliente.

## Concurrencia

- Caja única con turnos secuenciales (no simultáneos): el sistema debe impedir abrir un turno
  nuevo si ya hay uno abierto.
- Estructura preparada para más de una sucursal/caja en el futuro sin ser el foco de esta
  iteración (no se optimiza para eso ahora).

## Entornos

- Un único entorno de Supabase para desarrollo/producción al inicio (como en los proyectos de
  referencia), migraciones versionadas en `supabase/migrations/`.
- Variables sensibles (credenciales de Mercado Pago, claves de Supabase) vía variables de
  entorno, nunca hardcodeadas (`.env.local`, `.env.example` documentando las claves requeridas).

## Fuera de alcance (esta iteración)

- Facturación electrónica AFIP.
- Múltiples sucursales/puntos de venta.
- Cuentas de cliente, fidelización, ventas online.
- Modo offline / sincronización diferida.

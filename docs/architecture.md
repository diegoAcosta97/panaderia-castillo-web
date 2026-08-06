# Arquitectura del proyecto

Convención de carpetas a respetar en todo el backlog de implementación (`docs/backlog/`, todavía
no escrito). Mismo esquema de capas que `biblioteca-liliana-bodoc-web` y `salus-web`: separar
dominio (reglas de negocio) de UI y de acceso a datos.

Diferencia clave con esos dos proyectos: acá **no existe ninguna pantalla pública**. Todo el
sistema es de uso interno del comercio, protegido por login (ver `docs/requisitos-no-funcionales.md`,
sección Seguridad).

```
app/                    Rutas (App Router). Lo más "delgado" posible: compone componentes de
                        features/ y llama hooks. Sin lógica de negocio ni queries a Supabase
                        directas.

  login/                Única ruta pública. Formulario de usuario/contraseña.

  admin/                Rutas exclusivas del rol administrador:
    productos/            alta/edición/listado, categorías
    ofertas/               combos
    descuentos/
    proveedores/
    gastos/                listado/reporte (el alta de gasto también vive en pos/, ver abajo)
    caja/                  historial de turnos y arqueos, aprobación de ajustes de stock
    control-stock/         inicio de conteo, revisión y aprobación de diferencias
    configuracion/         datos del comercio (`configuracion_negocio`)

  pos/                   Rutas de cajero y administrador (punto de venta):
    (venta)/               pantalla principal: armar venta, cobrar
    caja/                  apertura/cierre del propio turno
    gastos/                alta rápida de un gasto durante el turno
    etiquetas/              generación e impresión de etiquetas

  api/
    mercadopago/webhook/  recibe confirmaciones de pago (sin sesión de usuario — se valida por
                          firma/secret de Mercado Pago, no por Supabase Auth)

components/             UI compartida y agnóstica de dominio (shadcn en components/ui).

features/                Una carpeta por dominio funcional:
  auth/                   login, logout, sesión, control de idle-timeout, RoleGate
  productos/              productos + categorías
  ofertas/
  descuentos/
  ventas/                 armado de venta, aplicación automática de ofertas/descuentos, cobro
  caja/                   apertura/cierre de turno, arqueo
  gastos/
  proveedores/
  etiquetas/              generación de lotes + impresión
  control-stock/          conteo periódico y aprobación de ajustes
  mercadopago/            generación de QR/preferencia, manejo del webhook
  reportes/               (a definir en el backlog: ventas por período, gastos por proveedor, etc.)

  Cada feature puede tener internamente components/, hooks/, services/, types/ — mismo criterio
  que en los proyectos de referencia.

repositories/            Acceso a datos puro contra Supabase (queries y RPCs). Un archivo por
                        entidad (productosRepository.ts, ventasRepository.ts, etc.). Sin lógica
                        de negocio.

services/               Lógica de negocio cross-feature (ej. cálculo de arqueo de caja, evaluación
                        de qué ofertas/descuentos corresponden a una venta, numeración de
                        comprobante).

hooks/                  Hooks compartidos, no atados a una feature.

types/                  Tipos compartidos (Database generado por Supabase, Role, ApiResult, etc.).

lib/
  supabase/              client.ts, server.ts, proxy.ts, admin.ts — igual patrón que
                        salus-web (convención "proxy", reemplazo de "middleware" en Next.js)
  mercadopago.ts          cliente del SDK de Mercado Pago
  barcode.ts              wrapper sobre jsbarcode (generación de código de barras on-the-fly)
  print.ts                helpers para las vistas de impresión (etiquetas y comprobante)

supabase/
  migrations/             una migración por cambio de esquema, versionada
```

## Reglas de dependencia

Mismas que en los proyectos de referencia:

- Los componentes de página (`app/**/page.tsx`) **no llaman a Supabase directamente**: usan hooks
  de `features/*/hooks`.
- Los **hooks** llaman a **services** (o directamente a **repositories** cuando no hay lógica de
  negocio adicional que orquestar).
- Los **repositories** son la única capa que conoce el esquema real de Supabase (nombres de
  tablas, columnas, RPCs). Si el esquema cambia, solo se toca el repository correspondiente.
- Operaciones que deben ser atómicas (descuento de stock al confirmar una venta, aplicación de
  ofertas/descuentos, numeración de comprobante) se resuelven con funciones de Postgres
  `SECURITY DEFINER` llamadas por RPC, no con múltiples updates sueltos desde el cliente — mismo
  criterio que `book_appointment` en `salus-web` (ver `docs/data-model.md`).

## Autenticación, sesión y ruteo por rol

- **Punto de entrada único**: `/login`. El `proxy.ts` de la raíz (mismo patrón que
  `lib/supabase/proxy.ts` de `salus-web` — reemplazo de "middleware" en las versiones recientes
  de Next.js) protege **todas** las rutas excepto `/login` y `/api/mercadopago/webhook`; sin
  sesión, cualquier otra ruta redirige a `/login`.
- **Redirección post-login por rol**: administrador → `/admin`; cajero → `/pos`. El administrador
  puede navegar también a `/pos` si necesita operar la venta.
- **Protección por rol dentro de la app**: rutas bajo `/admin` verifican `rol = 'administrador'`
  en `proxy.ts` o en un layout server-side (no solo ocultando UI); componente `RoleGate` (como
  en `salus-web`) para ocultar/mostrar acciones puntuales dentro de una misma pantalla.
- **Caducidad por inactividad (1 hora)**: un `SessionProvider` (client component, en
  `features/auth`) trackea actividad del usuario (mouse/teclado/touch) y llama
  `supabase.auth.signOut()` + redirección a `/login` a los 60 minutos sin interacción. Es
  independientemente del *access token* de Supabase (que se refresca solo mientras hay
  actividad) — el idle timeout es una capa propia por encima, pensada para que no quede una
  sesión abierta en la terminal del local. No cierra el turno de caja abierto (RF-10.3).

## Estado de esta convención

Proyecto nuevo — se arranca directamente con esta estructura, no hay código previo que migrar.

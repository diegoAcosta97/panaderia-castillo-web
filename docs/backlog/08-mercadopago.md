# EPIC 8 — Integración Mercado Pago

QR dinámico (Checkout Pro / QR API) para cobrar en el mostrador, con confirmación automática
por webhook (RF-7, decisión registrada en `docs/data-model.md`).

---

### E8-1 — Cliente del SDK de Mercado Pago ✅ Hecho (2026-08-07)
- **Descripción:** `lib/mercadopago.ts` con el cliente configurado desde variables de entorno
  (access token del comercio, nunca hardcodeado). No existe un SDK oficial de Node mantenido
  para la API de Orders/QR moderna, así que es un wrapper propio sobre `fetch`
  (`mercadoPagoFetch<T>()`) contra `https://api.mercadopago.com`, con `MercadoPagoError` tipado.
  Protegido con `server-only` — nunca se puede importar desde un Client Component.
  **Decisión corregida en el diseño respecto al enunciado original:** el enunciado de este
  EPIC asumía Checkout Pro (el cliente escanea un QR que lo manda a pagar por link). El usuario
  (dueño del comercio físico) hizo notar correctamente que eso no tiene sentido para mostrador
  físico: el QR tiene que quedar fijo en la caja y ser el cliente el que lo escanea con la app
  de Mercado Pago, no al revés. Se rediseñó sobre la **API de Orders (`/v1/orders`, `type:
  "qr"`, `config.qr.mode: "dynamic"`)**, la API unificada de pagos presenciales de MP
  (introducida ~sept. 2025), que requiere un Store y un POS registrados de antemano contra la
  cuenta del comercio (ver `scripts/mercadopago/setupStoreAndPos.ts`, E8-2).
- **Depende de:** `00-fundamentos.md#E0-1`
- **Archivos/módulos:** `lib/mercadopago.ts`, `.env.local` (`MERCADOPAGO_ACCESS_TOKEN`)
- **Cambios de base de datos:** —
- **Criterios de aceptación:**
  - [x] El cliente se instancia sin error con credenciales de prueba (sandbox) — verificado
        contra la cuenta de test real (`GET /users/me` devuelve el `test_user_...@testuser.com`
        de la cuenta de prueba). Nota: los tokens de las cuentas de test de MP llevan el mismo
        prefijo `APP_USR-` que producción (no `TEST-`) — confirmado tanto empíricamente como en
        la documentación oficial ("Use test Access Tokens during development, prefix: APP_USR").

---

### E8-2 — Generación de QR dinámico por venta ✅ Hecho (2026-08-07)
- **Descripción:** `features/mercadopago/services/qrService.ts` — dado el monto asignado a
  Mercado Pago, crea una orden QR dinámica en MP (`crearOrdenQr`) contra el Store/POS
  registrados del comercio y devuelve la data para renderizar el QR. Se guarda
  `mp_referencia_externa` en `venta_medios_pago` (vía `registrar_qr_pago`, función
  `SECURITY DEFINER` que valida `auth.uid()`) para poder matchear el webhook (RF-7.1).
  `features/ventas/components/QrMercadoPago.tsx` renderiza la imagen con `qrcode`
  (`QRCode.toDataURL`), mismo patrón usado en `biblioteca-liliana-bodoc-web`.
  **Setup previo (una sola vez, `scripts/mercadopago/setupStoreAndPos.ts`, idempotente):**
  crea el Store (id real `85782232`) y el POS (id real `136365347`, `external_id:
  "PANADERIACASTILLOCAJA1"`) de la cuenta de test contra la API real, y guarda esos ids en
  `configuracion_negocio` (`mercadopago_store_id`, `mercadopago_external_pos_id`,
  migración `20260807140000_add_mercadopago_config.sql`).
  **Detalles del payload de `/v1/orders` descubiertos empíricamente** (la documentación pública
  no alcanzaba para armar el request a la primera):
  - `transactions: { payments: [{ amount }] }` es **obligatorio** — sin él, MP devuelve
    `missing properties: transactions`.
  - Monto mínimo real **$15** (`MONTO_MINIMO_ORDEN_QR`) — por debajo, MP rechaza con `Amount
    must be greater than or equal to 15.00`.
  - Al crear el Store, `location.city_name` se valida contra una lista fija por provincia —
    `"Ciudad Autónoma de Buenos Aires"` no es válida para `state_name: "Buenos Aires"`
    (se usó `"La Plata"`).
  - El `external_id` del POS debe ser alfanumérico puro, sin guiones ni guiones bajos.
- **Depende de:** E8-1, `07-punto-de-venta.md#E7-2`
- **Archivos/módulos:** `features/mercadopago/services/qrService.ts`,
  `features/mercadopago/actions.ts` (`generarQrParaVenta`),
  `features/ventas/components/QrMercadoPago.tsx`,
  `supabase/migrations/20260807150000_create_registrar_qr_pago_function.sql`,
  `scripts/mercadopago/setupStoreAndPos.ts`
- **Cambios de base de datos:** función `registrar_qr_pago`; columnas
  `mercadopago_store_id`/`mercadopago_external_pos_id` en `configuracion_negocio`
- **Criterios de aceptación:**
  - [x] Cobrar (parcial o total) con Mercado Pago muestra un QR válido, escaneable por la app
        de MP en sandbox — verificado visualmente en el navegador real contra una orden real
        creada en la API (ver nota de verificación de E8-4)

---

### E8-3 — Webhook de confirmación de pago ✅ Hecho (2026-08-07)
- **Descripción:** `app/api/mercadopago/webhook/route.ts`.
  **Corrección de diseño respecto al enunciado original:** el enunciado planteaba validar el
  webhook por firma/secret (`x-signature`). Se investigó contra la documentación oficial de MP y
  se confirmó que **las notificaciones de Código QR no soportan validación por firma** — MP lo
  dice explícitamente para este tipo de notificación. El modelo de seguridad correcto (y el que
  se implementó) es tratar el payload del webhook como un simple disparador no confiable: la
  ruta nunca actúa sobre lo que dice el body, solo lo usa para saber qué orden re-consultar
  (`getOrdenQr`) contra la propia API de MP con el access token del servidor **antes** de tocar
  la base. Un payload falso apuntando a una orden real no logra nada (se relee el estado real);
  uno apuntando a una orden inexistente falla al reconsultar y no hace nada. Siempre devuelve
  200 (incluso ante error interno, logueado con `console.error`) para que MP no reintente
  indefinidamente algo que ya quedó registrado para revisar a mano.
  La actualización de la venta la hace `procesar_resultado_pago_mp` (`SECURITY DEFINER`, sin
  chequeo de `auth.uid()` porque la llama el webhook sin sesión de usuario — en cambio, el
  permiso de ejecutarla se **revoca** explícitamente tanto a `public` como a `authenticated`, así
  que ni siquiera un administrador logueado puede invocarla por su cuenta). Es idempotente
  (si el medio de pago ya no está `pendiente`, no vuelve a tocar nada — cubre reintentos de MP).
  Acreditado → actualiza el medio de pago, y si **todos** los medios de la venta (caso
  Combinado) quedan acreditados, recién ahí pasa la venta a `completada` y descuenta stock
  (mismo patrón de `confirmar_venta`, con `for update` por producto). Rechazado/expirado → el
  medio de pago queda `rechazado`, la venta sigue `pendiente_pago`, disponible para reintentar el
  cobro (RF-7.3), sin tocar stock.
- **Depende de:** E8-2, `07-punto-de-venta.md#E7-3`
- **Archivos/módulos:** `app/api/mercadopago/webhook/route.ts`,
  `supabase/migrations/20260807160000_create_procesar_resultado_pago_mp_function.sql`,
  `repositories/ventasRepository.ts` (`procesarResultadoPagoMP`)
- **Cambios de base de datos:** función `procesar_resultado_pago_mp`
- **Criterios de aceptación:**
  - [x] ~~Un webhook con firma inválida se rechaza (401/403)~~ — no aplica: MP no ofrece firma
        para notificaciones QR (ver nota de diseño arriba); la seguridad es re-consulta a la
        fuente, no validación de firma
  - [x] Un webhook válido de pago acreditado deja la venta en `completada` y descuenta stock
  - [x] Un webhook de pago rechazado/expirado deja la venta disponible para reintentar el cobro
        (RF-7.3), sin descontar stock
  - **Limitación conocida y aceptada:** el flujo end-to-end real (un cliente escaneando de
    verdad con la app de Mercado Pago y MP pegándole al webhook en producción) no se puede
    automatizar desde acá — requiere o un escaneo físico con la app de MP, o desplegar con una
    URL de webhook pública. Queda pendiente que el usuario lo prueba a mano al menos una vez
    antes de ir a producción.

---

### E8-4 — Pantalla de espera de pago ✅ Hecho (2026-08-07)
- **Descripción:** mientras la venta está `pendiente_pago`, `PantallaCobro` llama a
  `generarQrParaVenta` y muestra `EsperandoPagoMP`, que hace polling cada pocos segundos contra
  `ventas.estado` (consulta directa a Supabase desde el cliente) y avanza sola apenas deja de
  estar `pendiente_pago` — sin recargar la página. Antes de este cambio, `PantallaCobro` tenía
  este camino deshabilitado con un mensaje placeholder; se reescribió para invocar el flujo real.
- **Depende de:** E8-3
- **Archivos/módulos:** `features/ventas/components/EsperandoPagoMP.tsx`,
  `features/ventas/components/PantallaCobro.tsx`
- **Cambios de base de datos:** —
- **Criterios de aceptación:**
  - [x] Verificado visualmente en un navegador real (Chrome, sesión logueada como
        administrador): turno de caja abierto, venta de $20 con "Mercado Pago" como medio de
        pago, `Confirmar venta` dispara `crearOrdenQr` contra la API real de MP (sandbox) y la
        pantalla muestra el QR generado (imagen real, escaneable) bajo "Esperando el pago...",
        con polling confirmado contra la red real (`GET .../rest/v1/ventas?select=estado,...`
        repitiéndose cada ~1-2s con `status 200`).
  - **Limitación conocida (igual que E8-3):** no se probó el avance automático de la pantalla
    con un pago acreditado de verdad — requiere el escaneo manual del usuario. La UI de espera y
    la generación del QR están confirmadas contra la API real; el último tramo (webhook →
    `completada` → la pantalla avanza sola) está cubierto por los criterios de E8-3 probados por
    separado (llamando la función `procesar_resultado_pago_mp` con datos simulando un pago
    acreditado), no por un pago real de punta a punta.

---

## Nota de verificación (2026-08-07)

Todo lo de este EPIC se verificó contra el proyecto de Supabase real y la cuenta de test real
de Mercado Pago — nunca contra mocks. Datos de prueba usados (producto, categoría, venta, turno
de caja) se crearon y se borraron después con un script ad hoc contra `SUPABASE_DB_URL`
(no versionado). Durante la verificación de E8-4 se encontró y bordeó (no se investigó a fondo,
queda para EPIC 3 si aparece de nuevo) un detalle de UX en el formulario de "Nuevo producto"
(`03-productos.md`): si no hay ninguna categoría cargada todavía, el submit falla con un error
crudo de Postgres (`22P02`) en vez de un mensaje de validación — probablemente `categoria_id` se
manda como string vacío en lugar de `null`/omitido.

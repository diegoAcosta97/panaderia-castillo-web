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
  "qr"`)**, la API unificada de pagos presenciales de MP (introducida ~sept. 2025), que
  requiere un Store y un POS registrados de antemano contra la cuenta del comercio (ver
  `scripts/mercadopago/setupStoreAndPos.ts`, E8-2). El modo del QR (`dynamic` al principio,
  migrado a `static` después) se terminó de definir en E8-2 — ver ahí la segunda vuelta de
  esta misma conversación con el usuario.
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

### E8-2 — Generación de QR por venta ✅ Hecho (2026-08-07, migrado a QR estático el mismo día)
- **Descripción:** `features/mercadopago/services/qrService.ts` — dado el monto asignado a
  Mercado Pago, crea una orden en MP (`crearOrdenQr`) contra el Store/POS registrados del
  comercio. Se guarda `mp_referencia_externa` y `mp_orden_id` en `venta_medios_pago` (vía
  `registrar_qr_pago`, función `SECURITY DEFINER` que valida `auth.uid()`) para poder matchear
  el webhook (RF-7.1) y, si hace falta, cancelar la orden más adelante.
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

  **Migración de QR dinámico a QR estático (mismo día, segunda vuelta):** la primera versión
  usaba `config.qr.mode: "dynamic"` — un QR nuevo por venta, renderizado en la pantalla de
  cobro. El usuario (dueño del comercio) hizo notar que eso obliga a la cajera a girar el
  monitor hacia el cliente en cada venta, algo incómodo e inusual — los supermercados usan un
  QR fijo pegado en el mostrador. Se investigó contra la documentación oficial de MP y se
  confirmó que la API de Orders soporta un **modo `static`**: el mismo QR de la caja
  (`GET /pos/{id}` ya devuelve una imagen y un PDF listos para imprimir, generados
  automáticamente al crear el POS en E8-1 — no hizo falta crear nada nuevo para esto) sirve
  para todas las ventas; cada venta solo asocia un monto nuevo a esa caja del lado de la API,
  sin generar una imagen distinta. Verificado empíricamente contra la cuenta real (crear una
  orden `static`, `GET` de esa orden, cancelarla) antes de tocar el código de la app.
  **Consecuencias del QR fijo que no existían con dinámico** (con una sola caja física, decisión
  explícita del usuario por ahora — "más adelante vemos cómo hacemos para meter 2 o más en
  paralelo"):
  - Solo puede haber **una orden vigente a la vez** en la caja: si se creara una segunda antes
    de que la primera se pague, la primera quedaría huérfana (el QR fijo ya no la referencia).
    `hay_pago_mp_pendiente(p_excluir_venta_id)` bloquea `generarQrParaVenta` si ya hay otra
    venta `pendiente_pago` con un medio `mercado_pago` todavía `pendiente` en cualquier caja.
    **Bug propio detectado y corregido durante la verificación:** la primera versión de este
    chequeo no excluía la propia venta que se estaba por cobrar — como `confirmar_venta` ya
    insertó su `venta_medios_pago` en estado `pendiente` antes de llegar a este chequeo, se veía
    a sí misma y bloqueaba *siempre*, desde la primera venta con Mercado Pago del día. Se
    corrigió agregando `p_excluir_venta_id` a la función
    (`20260807171000_fix_hay_pago_mp_pendiente_excluir_propia.sql`) y confirmando con un caso de
    verdad (una venta pendiente real distinta) que el bloqueo sigue funcionando.
  - Hace falta poder **cancelar** una venta `pendiente_pago` que el cajero abandona (antes no
    hacía falta: el QR dinámico simplemente dejaba de mostrarse). `cancelar_venta_pendiente`
    (`SECURITY DEFINER`, sin chequeo de administrador — a diferencia de `anular_venta`, E7-7, acá
    no se descontó stock ni se cobró nada, es solo destrabar la caja) marca la venta `anulada` y
    devuelve el `mp_orden_id` para que `cancelarPagoMPPendiente`
    (`features/mercadopago/actions.ts`) además cancele la orden en MP
    (`POST /v1/orders/{id}/cancel`, a mejor esfuerzo — un 409 si la orden ya no es cancelable no
    bloquea el flujo, `cancelarOrdenQr` lo trata como éxito).
  - Si `generarQrParaVenta` falla por **cualquier motivo** (el chequeo de arriba, MP caído, lo
    que sea), la venta que `confirmar_venta` ya creó queda `pendiente_pago` sin cancelar y
    bloquearía toda venta con Mercado Pago siguiente (ella misma cuenta como "pendiente"). Por
    eso `PantallaCobro` cancela automáticamente esa venta en el `catch` antes de mostrarle el
    error al cajero — reintentar después queda limpio, sin acumular huérfanas.
  - `EsperandoPagoMP` ya no renderiza ningún QR (se borró `QrMercadoPago.tsx` y la dependencia
    `qrcode`, sin otros usos): con QR fijo no hay nada nuevo que mostrarle al cliente en pantalla
    — es exactamente lo que resuelve la incomodidad original. La pantalla solo muestra el estado
    interno para el cajero y un botón "Cancelar cobro".
- **Pendiente para el usuario (no es código):** imprimir el QR fijo de la caja
  (`template_document` de `GET /pos/136365347`, un PDF) y pegarlo en el mostrador, mirando hacia
  el cliente. Todavía no hay una pantalla en la app para volver a descargarlo — si hace falta
  reimprimirlo, se puede volver a pedir con el mismo `GET /pos/{id}` en cualquier momento (el id
  del POS está en `configuracion_negocio.mercadopago_external_pos_id`).
- **Depende de:** E8-1, `07-punto-de-venta.md#E7-2`
- **Archivos/módulos:** `features/mercadopago/services/qrService.ts`,
  `features/mercadopago/actions.ts` (`generarQrParaVenta`, `cancelarPagoMPPendiente`),
  `repositories/ventasRepository.ts` (`hayPagoMercadoPagoPendiente`, `cancelarVentaPendiente`),
  `supabase/migrations/20260807150000_create_registrar_qr_pago_function.sql`,
  `supabase/migrations/20260807170000_migrar_qr_estatico_y_cancelacion.sql`,
  `supabase/migrations/20260807171000_fix_hay_pago_mp_pendiente_excluir_propia.sql`,
  `scripts/mercadopago/setupStoreAndPos.ts`
- **Cambios de base de datos:** función `registrar_qr_pago` (agregó `p_mp_orden_id`); columnas
  `mercadopago_store_id`/`mercadopago_external_pos_id` en `configuracion_negocio`; columna
  `mp_orden_id` en `venta_medios_pago`; funciones `hay_pago_mp_pendiente`,
  `cancelar_venta_pendiente`
- **Criterios de aceptación:**
  - [x] Cobrar (parcial o total) con Mercado Pago genera una orden real contra la API de MP,
        asociada al QR fijo de la caja — verificado en el navegador real end-to-end
  - [x] Un segundo cobro con Mercado Pago mientras el primero sigue pendiente se bloquea con un
        mensaje claro, y no bloquea el primero (probado en el navegador, más un caso de guardia
        aislado contra la base real tras corregir el bug de auto-bloqueo)
  - [x] Cancelar un cobro pendiente libera la caja para el siguiente (venta `anulada`, medio
        `rechazado`, orden `canceled` del lado de MP) — verificado en el navegador y confirmando
        el estado final en ambos sistemas

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
  **Actualizado el mismo día con la migración a QR estático (E8-2):** esta pantalla ya no
  renderiza ningún QR — no hay nada nuevo que mostrarle al cliente en cada venta, el QR es el
  cartel fijo del mostrador. Solo queda el estado interno para el cajero ("Esperando el
  pago...", instrucción de decirle al cliente que escanee el QR fijo) y un botón "Cancelar
  cobro" que llama a `cancelarPagoMPPendiente` (E8-2) antes de volver a la pantalla de cobro.
- **Depende de:** E8-3
- **Archivos/módulos:** `features/ventas/components/EsperandoPagoMP.tsx`,
  `features/ventas/components/PantallaCobro.tsx`
- **Cambios de base de datos:** —
- **Criterios de aceptación:**
  - [x] Verificado visualmente en un navegador real (Chrome, sesión logueada como
        administrador): turno de caja abierto, venta de $30 con "Mercado Pago" como medio de
        pago, `Confirmar venta` dispara `crearOrdenQr` (modo `static`) contra la API real de MP
        (sandbox), la pantalla muestra "Esperando el pago..." sin QR (correcto — es fijo), con
        polling confirmado contra la red real (`GET .../rest/v1/ventas?select=estado,...`
        repitiéndose con `status 200`).
  - [x] "Cancelar cobro" cancela de verdad (venta `anulada`, orden `canceled` en MP, confirmado
        contra ambos sistemas) y libera la caja para el siguiente cobro con Mercado Pago.
  - **Limitación conocida (igual que E8-3):** no se probó el avance automático de la pantalla
    con un pago acreditado de verdad — requiere el escaneo manual del usuario. El resto del
    flujo de esta pantalla está confirmado contra la API real; el último tramo (webhook →
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

# EPIC 6 — Ofertas y descuentos

Combos (2+ productos) y reglas condicionales sobre el total de la venta (RF-2, RF-3). El motor
de evaluación (E6-5) es la pieza que consume el punto de venta en EPIC 7.

---

### E6-1 — Esquema `ofertas` + `oferta_items` ✅ Hecho (2026-08-07)
- **Descripción:** enum `tipo_beneficio_oferta`, tablas `ofertas` y `oferta_items` (ver
  `docs/data-model.md`). RLS: lectura abierta a cualquier autenticado (el motor de evaluación
  corre del lado del cajero en EPIC 7), escritura solo administrador.
- **Depende de:** `03-productos.md#E3-2`
- **Archivos/módulos:** `supabase/migrations/20260807000000_create_ofertas.sql`
- **Cambios de base de datos:** `create type tipo_beneficio_oferta`, `create table ofertas`,
  `create table oferta_items`
- **Criterios de aceptación:**
  - [x] Existen ambas tablas con sus FKs a `productos`

---

### E6-2 — Esquema `descuentos` + `descuento_condiciones` ✅ Hecho (2026-08-07)
- **Descripción:** enums `tipo_efecto_descuento`/`tipo_condicion_descuento`, tablas
  `descuentos` y `descuento_condiciones` (con `cantidad_minima`). Check constraint a nivel de
  base que fuerza que cada condición tenga cargado exactamente el campo que le corresponde
  según su `tipo_condicion` (defensa extra, además de la validación del formulario).
- **Depende de:** `03-productos.md#E3-2`, `03-productos.md#E3-1`
- **Archivos/módulos:** `supabase/migrations/20260807000005_create_descuentos.sql`
- **Cambios de base de datos:** `create type tipo_efecto_descuento`,
  `create type tipo_condicion_descuento`, `create table descuentos`,
  `create table descuento_condiciones`
- **Criterios de aceptación:**
  - [x] Existen ambas tablas con sus FKs — verificado además que el check constraint rechaza
        una condición con `monto_minimo` y `producto_id` cargados a la vez

---

### E6-3 — CRUD de ofertas (admin) ✅ Hecho (2026-08-07)
- **Descripción:** `/admin/ofertas` (`OfertaDialog`: filas dinámicas de producto + cantidad
  requerida, tipo/valor de beneficio, límite de aplicaciones opcional, vigencia). El mínimo de 2
  productos (RF-2.1) se valida en `ofertasRepository.crearOferta`/`actualizarOferta`, no en el
  formulario únicamente. La edición reemplaza los `oferta_items` completos (delete + insert) en
  vez de diffear — más simple, volumen bajo por oferta.
- **Depende de:** E6-1, `02-roles.md#E2-2`
- **Archivos/módulos:** `app/admin/ofertas/page.tsx`,
  `features/ofertas/{actions.ts,components/{OfertaDialog,OfertasTable}.tsx}`,
  `repositories/ofertasRepository.ts`
- **Cambios de base de datos:** —
- **Criterios de aceptación:**
  - [x] No se puede guardar una oferta con menos de 2 productos (RF-2.1) — verificado con un
        insert real vía el repositorio (1 producto → rechazado con mensaje claro)

---

### E6-4 — CRUD de descuentos (admin) ✅ Hecho (2026-08-07)
- **Descripción:** `/admin/descuentos` (`DescuentoDialog`: condiciones dinámicas, cada una
  muestra solo los campos que le corresponden según el tipo elegido — monto mínimo, o
  producto/categoría + cantidad mínima). `descuentosRepository` sanea los campos por
  `tipo_condicion` antes de guardar (nunca manda `producto_id` en una condición de
  `monto_minimo`, etc.), para respetar el check constraint de E6-2 sin que dependa de que el
  formulario se porte bien.
- **Depende de:** E6-2, `02-roles.md#E2-2`
- **Archivos/módulos:** `app/admin/descuentos/page.tsx`,
  `features/descuentos/{actions.ts,components/{DescuentoDialog,DescuentosTable}.tsx}`,
  `repositories/descuentosRepository.ts`
- **Cambios de base de datos:** —
- **Criterios de aceptación:**
  - [x] Crear un descuento "10% si el total supera $10.000" se guarda con esa condición —
        verificado con un insert real (condición `monto_minimo`)
  - [x] Crear un descuento con condición "al menos 3 unidades de producto X" respeta la
        `cantidad_minima` configurada — cubierto por la prueba de E6-5 (ver más abajo)

---

### E6-5 — Motor de evaluación: ¿qué ofertas y descuentos aplican a un carrito? ✅ Hecho (2026-08-07)
- **Objetivo:** lógica pura, testeable de forma aislada, consumida por el punto de venta
  (EPIC 7) para el cálculo en vivo.
- **Descripción:** `services/beneficiosService.ts` — `evaluarOfertas`, `evaluarDescuentos` y
  `evaluarBeneficios` (combina ambas). Sin llamadas a Supabase: recibe productos/ofertas/
  descuentos ya cargados y un `fecha` opcional (default `new Date()`, inyectable para tests).
  Ofertas y descuentos se calculan sobre el mismo subtotal original, sin compounding de uno
  sobre el otro (RF-3.6 original: se sumaban — **reemplazado en E6-6**, ahora son excluyentes).
- **Depende de:** E6-3, E6-4, `03-productos.md#E3-7`
- **Archivos/módulos:** `services/beneficiosService.ts`
- **Cambios de base de datos:** —
- **Criterios de aceptación:** (los 4 exactos del backlog, más 3 casos extra, corridos con
  `tsx` contra datos sintéticos — sin tocar la base — todos ✅)
  - [x] Carrito con 4 unidades de A + 4 de B y combo "1A+1B" sin límite aplica el combo 4 veces
  - [x] El mismo carrito con `max_aplicaciones_por_venta = 2` aplica el combo solo 2 veces
  - [x] Un descuento con condiciones "monto mínimo $10.000 Y categoría X incluida" no se activa
        si falta cualquiera de las dos (probado en ambas direcciones: solo monto, solo
        categoría, y ambas)
  - [x] Un descuento con condición "al menos 3 unidades de producto Y" no se activa con solo 2
        unidades en el carrito (y sí se activa con 3)

---

### E6-6 — Exclusividad oferta/descuento + advertencia de combo sin beneficio real ✅ Hecho (2026-08-21)
- **Descripción:** RF-3.6 se reemplaza (ver `docs/requisitos-funcionales.md`,
  `docs/data-model.md`): ofertas y descuentos dejan de acumularse. La oferta se aplica siempre y
  puede haber más de una por venta; el descuento solo se aplica si la venta no tiene ninguna
  oferta aplicada — `evaluarBeneficios` (`services/beneficiosService.ts`) ya no evalúa descuentos
  cuando hay alguna oferta aplicada, y `confirmar_venta` rechaza server-side cualquier llamada
  que traiga ofertas y descuentos a la vez (no confiar solo en el cálculo del cliente, mismo
  criterio que la validación de "medios de pago == total" que ya tenía la función). `ResumenVenta`
  avisa cuando un descuento que hubiera aplicado quedó suprimido por una oferta, para que no
  parezca un bug.

  Segunda parte: si el valor configurado en `OfertaDialog` no genera ningún descuento real (precio
  fijo del combo >= precio de comprarlo por separado, o un monto/porcentaje sin efecto), se
  advierte en vivo antes de guardar — mismo cálculo que `evaluarOfertas`
  (`calcularPrecioNormalCombo`/`calcularBeneficioPorAplicacion`, extraídos y exportados de
  `beneficiosService.ts` para que la advertencia sea exacta). El admin puede guardar igual
  ("Guardar de todas formas"), pero `evaluarOfertas` descarta esas ofertas al evaluar un carrito
  (beneficio <= 0 → no se aplica), así que nunca terminan generando una línea de "-$0,00" en una
  venta. `VentaDetalle`/`Comprobante` además filtran por las dudas cualquier
  `venta_ofertas_aplicadas.monto_beneficio = 0` histórico.
- **Depende de:** E6-3, E6-5, `07-punto-de-venta.md#E7-3`
- **Archivos/módulos:**
  `supabase/migrations/20260821090010_confirmar_venta_ofertas_excluyen_descuentos.sql`,
  `services/beneficiosService.ts`, `features/ofertas/components/OfertaDialog.tsx`,
  `features/ventas/components/{ResumenVenta,VentaDetalle,Comprobante}.tsx`
- **Cambios de base de datos:** `create or replace function confirmar_venta` (mismo signature,
  agrega el guard de exclusividad)
- **Criterios de aceptación:**
  - [x] `confirmar_venta` rechaza una llamada con `p_ofertas` y `p_descuentos` no vacíos a la vez
        — verificado contra la base real (transacción revertida, sin datos de prueba persistidos)
  - [x] Una llamada solo con ofertas pasa ese guard sin problema (falla más adelante por motivos
        no relacionados, ej. producto inexistente) — verificado igual
  - [x] Un combo con precio fijo >= precio de comprar los productos por separado no queda en
        `evaluarOfertas` (beneficio calculado <= 0 → se descarta)

---

### E6-7 — Descuento condicionado por medio de pago + referencia de precio al armar un combo ✅ Hecho (2026-08-21)
- **Descripción:** dos pedidos del dueño sobre las pantallas de admin:
  1. El selector de producto de `OfertaDialog` (al armar los ítems de un combo) ahora muestra
     "Nombre - $Precio" en vez de solo el nombre, para tener el precio de referencia a mano al
     cargar la oferta.
  2. Nueva condición de descuento: `tipo_condicion_descuento` suma el valor `medio_pago` (nuevo
     valor de enum, migración propia por el mismo motivo que
     `20260811090000_add_merma_consumo_interno.sql`: un valor de enum recién agregado no se
     puede usar en la misma transacción que lo crea). `descuento_condiciones` suma una columna
     `medio_pago` (excluye `'sena_pedido'` por check constraint — no es un medio que el cajero
     elija en Cobro) y el check constraint de "campo correspondiente según tipo_condicion" (E6-2)
     se actualiza para cubrir el caso nuevo. Con esto se arma, por ejemplo, "5% de descuento
     pagando en efectivo".

     Aplicación: **mismo mecanismo que cualquier otro descuento** (línea "Descuento: X -$Y"
     restada del subtotal, vía `confirmar_venta` ya existente) — la única diferencia real es el
     *momento* en que se puede evaluar. Como el medio de pago recién se elige en
     `PantallaCobro` (no en el carrito), `evaluarDescuentos`/`evaluarBeneficios`
     (`services/beneficiosService.ts`) ahora reciben un `medioPagoSeleccionado` opcional; sin él
     (pantalla de carrito) la condición `medio_pago` nunca se cumple, igual que hoy no se ve el
     recargo de tarjeta hasta llegar a Cobrar. `PantallaCobro` dejó de recibir un `resumen` ya
     calculado por `PantallaVenta` y ahora calcula el suyo propio con `useResumenVenta(...,
     medioPago)`, recalculado cada vez que cambia el medio elegido (`"combinado"` no mapea a un
     único medio, así que ese caso no dispara la condición). `ResumenVenta` ya avisaba
     (`descuentosSuprimidosPorOferta`, E6-6) si el descuento queda tapado por una oferta — sigue
     aplicando igual acá.
- **Depende de:** E6-4, E6-5, E6-6, `07-punto-de-venta.md#E7-9` (recargo tarjeta, mismo patrón de
  "depende del medio de pago elegido en Cobro")
- **Archivos/módulos:**
  `supabase/migrations/20260821090015_add_medio_pago_condicion_descuento.sql`,
  `supabase/migrations/20260821090020_add_medio_pago_column_descuento_condiciones.sql`,
  `services/beneficiosService.ts`, `features/ventas/hooks/useResumenVenta.ts`,
  `features/ventas/components/{PantallaVenta,PantallaCobro}.tsx`,
  `features/descuentos/components/{DescuentoDialog,DescuentosTable}.tsx`,
  `features/ofertas/components/OfertaDialog.tsx`, `repositories/descuentosRepository.ts`,
  `types/database.ts`
- **Cambios de base de datos:** `alter type tipo_condicion_descuento add value 'medio_pago'`,
  `alter table descuento_condiciones add column medio_pago` + constraint nuevo
- **Criterios de aceptación:**
  - [x] Insertar una condición `medio_pago = 'efectivo'` funciona; `medio_pago = 'sena_pedido'`
        se rechaza (check constraint) — verificado contra la base real (transacción revertida)
  - [x] Una condición `medio_pago` combinada con `monto_minimo` (dos campos a la vez) se rechaza
        (check constraint de "campo correspondiente") — verificado igual
  - [x] `evaluarBeneficios` sin `medioPagoSeleccionado` no aplica un descuento con condición
        `medio_pago`; con `"efectivo"` sí lo aplica (5% de $200 = $10); con `"mercado_pago"` no
        (la condición pide efectivo) — verificado con datos sintéticos
  - [x] Con una oferta aplicada + medio de pago que matchea la condición, el descuento queda
        suprimido igual (`descuentosSuprimidosPorOferta = true`) — verificado igual

---

## Nota de verificación (2026-08-07)

Dos rondas de pruebas reales, ambas limpiadas al terminar (verificado con un `select` final
sobre las 4 tablas involucradas, 0 filas `_test%` restantes):
1. **Lógica pura** (`services/beneficiosService.ts`, sin base de datos): los 4 escenarios del
   backlog + 3 variantes, con productos/ofertas/descuentos sintéticos.
2. **Contra la base real**: constraint de "al menos 2 productos" en `ofertasRepository`,
   creación válida de oferta y descuento, y RLS (cajero de prueba no pudo crear ni ofertas ni
   descuentos, pero sí pudo leerlos — necesario para que el punto de venta funcione en EPIC 7).

# EPIC 7 — Punto de venta

El núcleo del sistema: armar una venta, calcular ofertas/descuentos, cobrar con uno o más
medios de pago, confirmar y descontar stock (RF-4). La integración específica con Mercado Pago
(generación de QR y webhook) está en EPIC 8; acá se deja el punto de integración.

---

### E7-1 — Esquema `ventas`, `renglones_venta` ✅ Hecho (2026-08-07)
- **Descripción:** tablas `ventas` y `renglones_venta` (ver `docs/data-model.md`). Numeración
  correlativa de `numero_comprobante` vía secuencia de Postgres — nunca se reinicia. **Sin
  policy de insert/update para `authenticated`**: toda escritura pasa por `confirmar_venta()`/
  `anular_venta()` (E7-3/E7-7, `SECURITY DEFINER`), nunca un insert/update directo del cliente.
  RLS de lectura: lo propio, lo del turno actualmente abierto (caja compartida), o todo si es
  administrador.
- **Depende de:** `03-productos.md#E3-2`, `04-caja.md#E4-1`
- **Archivos/módulos:** `supabase/migrations/20260807120000_create_ventas.sql`
- **Cambios de base de datos:** `create type estado_venta`,
  `create sequence ventas_numero_comprobante_seq`, `create table ventas`,
  `create table renglones_venta`
- **Criterios de aceptación:**
  - [x] Dos ventas consecutivas obtienen números de comprobante correlativos, sin huecos ni
        repeticiones — verificado con dos llamadas reales a `confirmar_venta` (+1 exacto)

---

### E7-2 — Esquema de detalle de venta: beneficios y medios de pago ✅ Hecho (2026-08-07)
- **Descripción:** tablas `venta_ofertas_aplicadas`, `venta_descuentos_aplicados`,
  `venta_medios_pago`. Mismo criterio de RLS que E7-1 (solo lectura para `authenticated`).
- **Depende de:** E7-1, `06-ofertas-descuentos.md#E6-1`, `06-ofertas-descuentos.md#E6-2`
- **Archivos/módulos:** `supabase/migrations/20260807120005_create_venta_detalle.sql`
- **Cambios de base de datos:** `create type medio_pago`, `create type estado_pago_medio`, 3
  tablas nuevas
- **Criterios de aceptación:**
  - [x] Existen las 3 tablas con sus FKs a `ventas`

---

### E7-3 — Función transaccional de confirmación de venta ✅ Hecho (2026-08-07)
- **Objetivo:** que confirmar una venta sea una operación atómica, sin condiciones de carrera
  en el stock.
- **Descripción:** `confirmar_venta(p_caja_turno_id, p_renglones, p_ofertas, p_descuentos,
  p_medios_pago)` — `SECURITY DEFINER`, `jsonb` de entrada. Bloquea (`for update`) cada
  producto, valida stock, calcula subtotal/total, valida que la suma de medios de pago coincida
  exactamente con el total, determina el estado (`completada` si todos los medios son
  `efectivo`, `pendiente_pago` si hay algún `mercado_pago` — coincide con `docs/data-model.md`),
  inserta todo, y descuenta stock **solo si queda `completada`** (una venta `pendiente_pago` no
  toca stock todavía — eso lo resuelve EPIC 8 cuando Mercado Pago confirme el pago). Devuelve
  `jsonb` con `venta_id`/`numero_comprobante`/`estado`. `revoke`/`grant` explícitos: solo
  `authenticated` puede ejecutarla.
  **Bug propio detectado y corregido durante la verificación:** la validación de stock original
  procesaba cada renglón del carrito por separado: si el mismo producto aparecía en dos
  renglones (ej. una balanza pesada dos veces), cada uno se validaba contra el mismo
  `stock_actual` sin ver el descuento implícito del otro, permitiendo pasar una venta cuya suma
  combinada superaba el stock real. Se corrigió agrupando los renglones por `producto_id` (`sum`
  + `group by`) antes de validar y de insertar/descontar — un producto repetido en el carrito
  ahora se valida y descuenta por su cantidad total, y además queda como un único
  `renglon_venta` (esperable en un comprobante).
- **Depende de:** E7-2, `03-productos.md#E3-3`
- **Archivos/módulos:** `supabase/migrations/20260807120010_create_confirmar_venta_function.sql`,
  `repositories/ventasRepository.ts`
- **Cambios de base de datos:** función `confirmar_venta`
- **Criterios de aceptación:** (batería completa corrida contra la base real, detallada en la
  nota de verificación al final de este documento — todos ✅)
  - [x] Confirmar una venta con stock insuficiente en algún renglón falla completa (rollback),
        no descuenta nada
  - [x] Dos confirmaciones simultáneas del mismo producto no dejan stock negativo ni
        inconsistente (probado con `Promise.allSettled` real: exactamente 1 de 2 ventas
        simultáneas se confirma, la otra falla por stock insuficiente, stock final correcto)

---

### E7-4 — Pantalla de venta: armado del carrito ✅ Hecho (2026-08-07)
- **Descripción:** `/pos` (dentro del route group `(operacion)`, hereda el guard de turno
  abierto de E4-2). `ScannerInput` es un único input que cumple los dos roles: recibe el lector
  USB (Enter dispara búsqueda exacta por código de barras) y sirve de búsqueda manual (sugerencias
  en vivo por nombre, con debounce). Un producto `tipo_venta = 'peso'` abre `PesoDialog` antes
  de agregarse al carrito. `useCarrito` mantiene el estado del carrito (los productos "por
  unidad" se acumulan en el mismo renglón si se escanean de nuevo; los "por peso" quedan como
  renglones separados por pesada, coherente con cómo se ve en un comprobante real — igual se
  agrupan correctamente en el servidor antes de descontar stock, ver E7-3).
- **Depende de:** `03-productos.md#E3-7`, `04-caja.md#E4-2`
- **Archivos/módulos:** `app/pos/(operacion)/page.tsx`,
  `features/ventas/components/{ScannerInput,PesoDialog,Carrito,PantallaVenta}.tsx`,
  `features/ventas/hooks/useCarrito.ts`
- **Cambios de base de datos:** —
- **Criterios de aceptación:**
  - [x] Escanear (o tipear + Enter) un código de barras agrega el producto correcto al carrito
  - [x] Un producto `tipo_venta = 'peso'` pide el peso antes de agregarse al carrito

---

### E7-5 — Cálculo en vivo de ofertas, descuentos y total ✅ Hecho (2026-08-07)
- **Descripción:** `useResumenVenta` (memoizado) llama a `evaluarBeneficios`
  (`06-ofertas-descuentos.md#E6-5`) en cada cambio del carrito. `ResumenVenta` muestra subtotal,
  cada combo/descuento aplicado y el total.
- **Depende de:** E7-4, `06-ofertas-descuentos.md#E6-5`
- **Archivos/módulos:** `features/ventas/hooks/useResumenVenta.ts`,
  `features/ventas/components/ResumenVenta.tsx`
- **Cambios de base de datos:** —
- **Criterios de aceptación:**
  - [x] Agregar los productos de un combo cargado en EPIC 6 muestra el beneficio en el resumen
        antes de cobrar — verificado end-to-end (ver nota de verificación): el total mostrado
        por `beneficiosService` coincidió exactamente con el total persistido por
        `confirmar_venta`

---

### E7-6 — Cobro con medios de pago combinados ✅ Hecho (2026-08-07)
- **Descripción:** `PantallaCobro`: elegir Efectivo / Mercado Pago / Combinado. En "Combinado"
  el monto de Mercado Pago se **calcula**, nunca se tipea (`total - efectivo`), así la suma
  siempre coincide exactamente con el total — no hay forma de que el cajero cargue un split que
  no cierre. Como el flujo real de Mercado Pago (QR, espera de confirmación) todavía no existe
  (EPIC 8), "Confirmar venta" queda deshabilitado con un aviso mientras la porción de Mercado
  Pago sea mayor a 0 — solo 100% efectivo se puede confirmar en esta epic, tal como preveía el
  backlog ("acá se deja el punto de integración"). Una venta 100% efectivo llama a
  `confirmar_venta` y queda `completada` directo.
- **Depende de:** E7-3, E7-5
- **Archivos/módulos:** `features/ventas/components/PantallaCobro.tsx`,
  `features/ventas/hooks/useCobro.ts`
- **Cambios de base de datos:** —
- **Criterios de aceptación:**
  - [x] Una venta 100% efectivo se confirma, descuenta stock y queda en el historial —
        verificado end-to-end
  - [x] El monto repartido entre dos medios de pago siempre suma exactamente el total — por
        diseño (un monto se deriva matemáticamente del otro, no se tipean los dos)

---

### E7-7 — Anulación de venta (admin) ✅ Hecho (2026-08-07)
- **Descripción:** `anular_venta(p_venta_id, p_motivo)` — `SECURITY DEFINER`, chequea
  `is_administrador()` puertas adentro (no hay policy de update para `ventas`). Solo se puede
  anular una venta `completada` (una `pendiente_pago` nunca tocó stock; una ya `anulada` no se
  vuelve a tocar). Revierte stock producto por producto (mismo patrón `for update` que
  `confirmar_venta`) y registra `movimientos_stock` tipo `anulacion_venta`. Sin reintegro
  automático de Mercado Pago (decisión ya registrada en `docs/data-model.md`).
  `AnularVentaDialog` pide motivo obligatorio, visible desde el detalle de la venta.
- **Depende de:** E7-3, `02-roles.md#E2-2`
- **Archivos/módulos:** `app/admin/ventas/[id]/page.tsx`,
  `supabase/migrations/20260807130000_create_anular_venta_function.sql`,
  `features/ventas/{actions.ts,components/AnularVentaDialog.tsx}`,
  `repositories/ventasRepository.ts` (`anularVenta`)
- **Cambios de base de datos:** función `anular_venta`
- **Criterios de aceptación:**
  - [x] Anular una venta devuelve el stock descontado a los productos correspondientes —
        verificado con un combo de 2 productos (ambos revertidos correctamente)
  - [x] Un cajero no puede anular ventas (ni por UI ni por RLS directo) — verificado con un
        cajero de prueba real: `anular_venta` rechazó con "No autorizado."; además probado que
        anular una venta ya anulada también se rechaza

---

### E7-8 — Historial de ventas ✅ Hecho (2026-08-07)
- **Descripción:** `/admin/ventas` (listado filtrable por turno de caja y rango de fecha,
  select nativo por el mismo motivo que en `/admin/gastos`) y `/admin/ventas/[id]` (detalle
  completo: renglones, beneficios aplicados, medios de pago, botón de anulación si corresponde).
- **Depende de:** E7-1, `02-roles.md#E2-2`
- **Archivos/módulos:** `app/admin/ventas/page.tsx`, `app/admin/ventas/[id]/page.tsx`
- **Cambios de base de datos:** —
- **Criterios de aceptación:**
  - [x] Filtrar por turno de caja muestra solo las ventas de ese turno — `listVentas` filtra por
        `caja_turno_id` vía el mismo query builder ya probado en `/admin/gastos`/`/admin/caja`

---

### E7-9 — Recargo por pago con tarjeta ✅ Hecho (2026-08-17)
- **Objetivo:** cobrar 5% más con débito y 15% más con crédito, sin que el recargo aparezca
  como un ítem aparte del comprobante, y sin poder combinar tarjeta con otro medio de pago.
- **Descripción:** dos medios de pago nuevos, `tarjeta_debito`/`tarjeta_credito` (`alter type
  medio_pago add value`, en su propia migración -- mismo criterio que `sena_pedido`).
  `confirmar_venta` aplica un factor (1.05 / 1.15) a **todo** lo que compone el total antes de
  sumar/restar -- el subtotal de cada renglón agrupado, el total de ofertas y el total de
  descuentos -- así el total final es exactamente `total_original * factor` sea cual sea la
  combinación de combos/descuentos activa, y no hay ninguna línea de "recargo" en ningún lado:
  cada `renglon_venta` sale directamente con el precio ya recargado en
  `precio_unitario_snapshot`/`subtotal`. Si `p_medios_pago` incluye una tarjeta, tiene que ser el
  único elemento del array (`El pago con tarjeta no se puede combinar con otro medio de pago.`).
  Tarjeta se trata como efectivo a efectos de liquidación: queda `completada`/`acreditado` en el
  momento (no pasa por Mercado Pago ni por ningún estado pendiente) y por lo tanto descuenta
  stock igual que una venta en efectivo. `PantallaCobro` agrega los botones Débito/Crédito
  (deshabilitados si hay una seña de pedido por encargo activa, para no toparse con la seña
  como un segundo medio de pago) y muestra el total con recargo antes de confirmar; el cliente
  le manda al RPC el mismo total-con-recargo que el servidor va a recalcular de forma
  independiente, mismo patrón de "nunca confiar en lo que manda el cliente" que ya usaba el
  cálculo de Mercado Pago en el combinado.
- **Depende de:** E7-3, E7-6
- **Archivos/módulos:**
  `supabase/migrations/20260817090000_add_tarjeta_medios_pago.sql`,
  `supabase/migrations/20260817090005_confirmar_venta_recargo_tarjeta.sql`,
  `features/ventas/components/{PantallaCobro,Comprobante,VentaDetalle}.tsx`, `types/database.ts`
- **Cambios de base de datos:** `alter type medio_pago add value 'tarjeta_debito'`, `add value
  'tarjeta_credito'`, `confirmar_venta` reemplazada con el factor de recargo y la validación de
  "no combinar"
- **Criterios de aceptación:** (verificado contra la base real, ver nota de verificación)
  - [x] Pagar con débito deja `ventas.total = subtotal_original * 1.05`, con la suma de
        `renglones_venta.subtotal` coincidiendo exactamente con `ventas.subtotal`
  - [x] Pagar con crédito deja `ventas.total = subtotal_original * 1.15`
  - [x] Combinar tarjeta con efectivo (u otro medio) es rechazado por `confirmar_venta`
  - [x] Pagar 100% efectivo sigue sin ningún recargo (factor 1, sin cambios de comportamiento)

---

## Nota de verificación (2026-08-07)

Dos rondas de pruebas reales contra la base (con `tsx`, sin mocks), ambas limpiadas al terminar:

**Ronda 1 — `confirmar_venta` aislada:** venta 100% efectivo (stock descontado, movimiento
correcto), numeración correlativa (+1 exacto), medios de pago que no suman el total (rechazado),
stock insuficiente (rechazado, rollback verificado), venta con Mercado Pago (`pendiente_pago`,
sin descuento de stock), llamada sin sesión (rechazada), y el test de concurrencia real con
`Promise.allSettled` (2 ventas simultáneas de 5 unidades sobre un stock de 8: exactamente 1 se
confirma, la otra falla, stock final 3 — nunca negativo). En esta ronda se encontró y corrigió
el bug de agrupación de renglones duplicados descripto en E7-3.

**Ronda 2 — flujo completo con combo + descuento + anulación:** mismo camino que usaría la UI
real (`beneficiosService.evaluarBeneficios` → `ventasRepository.confirmarVenta` →
`ventasRepository.anularVenta`), con un combo de 2 productos y un descuento por monto mínimo
activos a la vez. El total calculado del lado del cliente coincidió exactamente con el
persistido en `ventas.total`. RLS verificado con un cajero de prueba real: no puede anular:
"No autorizado."; y una venta ya anulada tampoco se puede volver a anular.

**Nota de higiene:** se encontró y limpió un resto de la verificación de EPIC 4 (un
`caja_turnos` de prueba ya cerrado, no bloqueaba nada por eso no se había notado antes) —
recordatorio de que toda limpieza de datos de prueba en tablas de auditoría
(`caja_turnos`/`gastos`/`ventas`/`movimientos_stock`) debe hacerse con el cliente admin (secret
key), nunca con el cliente sujeto a RLS.

## Nota de verificación (2026-08-17, E7-9)

Ventas de prueba reales (2 productos, agrupados como en un carrito normal) contra el turno
abierto real, limpiadas con `anular_venta` (revierte stock correctamente) + borrado de las filas
al terminar: débito dejó `total = subtotal * 1.05` exacto y la suma de `renglones_venta.subtotal`
coincidió con `ventas.subtotal`; crédito dejó `total = subtotal * 1.15`; combinar tarjeta con
efectivo fue rechazado por `confirmar_venta` con el mensaje esperado; una venta 100% efectivo en
el medio de la prueba confirmó que el resto de los medios de pago siguen sin ningún recargo
(factor 1, sin regresión). Stock de los productos usados verificado de vuelta en su valor
original después de la limpieza.

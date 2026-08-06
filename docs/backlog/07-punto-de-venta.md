# EPIC 7 — Punto de venta

El núcleo del sistema: armar una venta, calcular ofertas/descuentos, cobrar con uno o más
medios de pago, confirmar y descontar stock (RF-4). La integración específica con Mercado Pago
(generación de QR y webhook) está en EPIC 8; acá se deja el punto de integración.

---

### E7-1 — Esquema `ventas`, `renglones_venta`
- **Descripción:** tablas `ventas` y `renglones_venta` (ver `docs/data-model.md`). Numeración
  correlativa de `numero_comprobante` vía secuencia de Postgres — nunca se reinicia (RF-4.7,
  nota de numeración en `docs/requisitos-no-funcionales.md`).
- **Depende de:** `03-productos.md#E3-2`, `04-caja.md#E4-1`
- **Archivos/módulos:** `supabase/migrations/..._create_ventas.sql`
- **Cambios de base de datos:** `create type estado_venta`,
  `create sequence ventas_numero_comprobante_seq`, `create table ventas`,
  `create table renglones_venta`
- **Criterios de aceptación:**
  - [ ] Dos ventas consecutivas obtienen números de comprobante correlativos, sin huecos ni
        repeticiones

---

### E7-2 — Esquema de detalle de venta: beneficios y medios de pago
- **Descripción:** tablas `venta_ofertas_aplicadas`, `venta_descuentos_aplicados`,
  `venta_medios_pago` (ver `docs/data-model.md`), enums `medio_pago`/`estado_pago_medio`.
- **Depende de:** E7-1, `06-ofertas-descuentos.md#E6-1`, `06-ofertas-descuentos.md#E6-2`
- **Archivos/módulos:** `supabase/migrations/..._create_venta_detalle.sql`
- **Cambios de base de datos:** `create type medio_pago`, `create type estado_pago_medio`, 3
  tablas nuevas
- **Criterios de aceptación:**
  - [ ] Existen las 3 tablas con sus FKs a `ventas`

---

### E7-3 — Función transaccional de confirmación de venta
- **Objetivo:** que confirmar una venta sea una operación atómica, sin condiciones de carrera
  en el stock (nota de concurrencia en `docs/data-model.md`).
- **Descripción:** función Postgres `SECURITY DEFINER` `confirmar_venta(...)` que en una sola
  transacción: valida stock suficiente de cada renglón que controla stock, lo descuenta (crea
  `movimientos_stock` tipo `venta`), inserta venta + renglones + beneficios + medios de pago, y
  devuelve el número de comprobante.
- **Depende de:** E7-2, `03-productos.md#E3-3`
- **Archivos/módulos:** `supabase/migrations/..._create_confirmar_venta_function.sql`
- **Cambios de base de datos:** función `confirmar_venta`
- **Criterios de aceptación:**
  - [ ] Confirmar una venta con stock insuficiente en algún renglón falla completa (rollback),
        no descuenta nada
  - [ ] Dos confirmaciones simultáneas del mismo producto no dejan stock negativo ni
        inconsistente

---

### E7-4 — Pantalla de venta: armado del carrito
- **Descripción:** `/pos` — input con foco permanente para el lector de código de barras USB
  (entra como si fuera tecleado + Enter) más búsqueda manual (`03-productos.md#E3-7`), agregado
  de renglones, ingreso de peso para productos `tipo_venta = 'peso'`, edición de
  cantidad/eliminación de renglón. Requiere turno de caja abierto.
- **Depende de:** `03-productos.md#E3-7`, `04-caja.md#E4-2`
- **Archivos/módulos:** `app/pos/page.tsx`, `features/ventas/components/{Carrito,ScannerInput}.tsx`,
  `features/ventas/hooks/useCarrito.ts`
- **Cambios de base de datos:** —
- **Criterios de aceptación:**
  - [ ] Escanear (o tipear + Enter) un código de barras agrega el producto correcto al carrito
  - [ ] Un producto `tipo_venta = 'peso'` pide el peso antes de agregarse al carrito

---

### E7-5 — Cálculo en vivo de ofertas, descuentos y total
- **Descripción:** integrar `services/beneficiosService.ts`
  (`06-ofertas-descuentos.md#E6-5`) en el carrito: subtotal, ofertas aplicadas, descuentos
  aplicados y total se recalculan en cada cambio del carrito (RF-4.2).
- **Depende de:** E7-4, `06-ofertas-descuentos.md#E6-5`
- **Archivos/módulos:** `features/ventas/hooks/useResumenVenta.ts`
- **Cambios de base de datos:** —
- **Criterios de aceptación:**
  - [ ] Agregar los productos de un combo cargado en EPIC 6 muestra el beneficio en el resumen
        antes de cobrar

---

### E7-6 — Cobro con medios de pago combinados
- **Descripción:** pantalla de cobro: pagar 100% efectivo, 100% Mercado Pago, o repartir el
  total entre ambos (RF-4.3). El flujo específico de Mercado Pago (QR, espera de confirmación)
  se completa en EPIC 8; acá se deja el punto de integración. Una venta 100% efectivo llama a
  `confirmar_venta` con estado `completada` directo (sin pasar por `pendiente_pago`).
- **Depende de:** E7-3, E7-5
- **Archivos/módulos:** `features/ventas/components/PantallaCobro.tsx`,
  `features/ventas/hooks/useCobro.ts`
- **Cambios de base de datos:** —
- **Criterios de aceptación:**
  - [ ] Una venta 100% efectivo se confirma, descuenta stock y queda en el historial
  - [ ] El monto repartido entre dos medios de pago siempre suma exactamente el total (sin
        diferencias de redondeo)

---

### E7-7 — Anulación de venta (admin)
- **Descripción:** desde `/admin/ventas` (E7-8) o el detalle de una venta: anular revierte
  stock (`movimientos_stock` tipo `anulacion_venta`) y marca `estado = 'anulada'` con
  `motivo_anulacion` (RF-4.6). Sin reintegro automático de Mercado Pago — decisión registrada en
  `docs/data-model.md`.
- **Depende de:** E7-3, `02-roles.md#E2-2`
- **Archivos/módulos:** `app/admin/ventas/[id]/page.tsx`, `repositories/ventasRepository.ts`
- **Cambios de base de datos:** función `anular_venta(venta_id, motivo)` (SQL,
  `SECURITY DEFINER`)
- **Criterios de aceptación:**
  - [ ] Anular una venta devuelve el stock descontado a los productos correspondientes
  - [ ] Un cajero no puede anular ventas (ni por UI ni por RLS directo)

---

### E7-8 — Historial de ventas
- **Descripción:** listado/búsqueda de ventas (por fecha, turno, número de comprobante) en
  `/admin/ventas`, con acceso al comprobante (EPIC 9) y a la anulación (E7-7).
- **Depende de:** E7-1, `02-roles.md#E2-2`
- **Archivos/módulos:** `app/admin/ventas/page.tsx`
- **Cambios de base de datos:** —
- **Criterios de aceptación:**
  - [ ] Filtrar por turno de caja muestra solo las ventas de ese turno

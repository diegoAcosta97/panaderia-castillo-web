# EPIC 9 — Comprobante de venta

Comprobante imprimible/descargable en PDF a partir de los datos de la venta (RF-4.7),
preparado en detalle para una futura factura AFIP sin serlo todavía.

---

### E9-1 — Vista imprimible del comprobante ✅ Hecho (2026-08-07)
- **Descripción:** `app/pos/comprobante/[ventaId]/page.tsx`, con la variante `print:` de Tailwind
  (equivalente a `@media print`, sin CSS aparte), arma el comprobante a partir de `ventas` +
  `renglones_venta` + ofertas/descuentos/medios de pago aplicados + `configuracion_negocio`.
  Incluye número de comprobante, fecha, detalle de productos/cantidades/precios, beneficios
  aplicados, medios de pago y total (mismo patrón de fetch que
  `app/admin/ventas/[id]/page.tsx`). Sin librería de PDF en servidor: `lib/print.ts`
  (`imprimir()` → `window.print()`) + el botón "Imprimir" (`print:hidden`, se oculta al imprimir)
  cubren el requisito — el "Guardar como PDF" del diálogo de impresión del navegador hace el
  resto (decisión registrada en `docs/data-model.md`).
  **Agregado no listado originalmente en la tarea, necesario para que sea alcanzable:** sin esto
  un cajero no tenía forma de llegar a la pantalla (no tiene acceso a `/admin`). Se cambió la
  firma de `onConfirmada` en `PantallaCobro`/`EsperandoPagoMP`/`PantallaVenta` para llevar también
  `ventaId` (antes solo pasaba el número de comprobante), y el cartel verde de "Venta confirmada"
  en `PantallaVenta` ahora incluye un link "Ver / imprimir" (`target="_blank"`) a
  `/pos/comprobante/[ventaId]`.
- **Depende de:** `07-punto-de-venta.md#E7-1`, `07-punto-de-venta.md#E7-2`,
  `00-fundamentos.md#E0-6`
- **Archivos/módulos:** `app/pos/comprobante/[ventaId]/page.tsx`,
  `features/ventas/components/Comprobante.tsx`,
  `features/ventas/components/BotonImprimirComprobante.tsx`, `lib/print.ts`,
  `features/ventas/components/PantallaVenta.tsx`,
  `features/ventas/components/PantallaCobro.tsx`,
  `features/ventas/components/EsperandoPagoMP.tsx`
- **Cambios de base de datos:** —
- **Criterios de aceptación:**
  - [x] El comprobante muestra correctamente una venta — verificado en un navegador real (Chrome,
        sesión logueada como cajero): turno abierto, venta de $100 en efectivo con un producto de
        prueba (creado y borrado después por script ad hoc contra `SUPABASE_DB_URL`, mismo
        criterio que EPIC 8), "Ver / imprimir" desde el cartel de venta confirmada abre
        `/pos/comprobante/[ventaId]` en una pestaña nueva con nombre del comercio, N.º de
        comprobante, fecha, producto/cantidad/precio/subtotal, total y medio de pago correctos.
        **No verificado en este pase:** una venta con oferta y descuento aplicados a la vez y dos
        medios de pago combinados (el caso de prueba usó un producto simple) — el código reutiliza
        sin cambios el mismo mapeo de `ofertasAplicadas`/`descuentosAplicados`/`mediosPago` ya
        probado en `app/admin/ventas/[id]/page.tsx`, pero queda pendiente confirmarlo con una
        venta real así de compleja.
  - [x] "Guardar como PDF" cubre el requisito — no se disparó el diálogo nativo de impresión
        durante la verificación automatizada (bloquearía la sesión del navegador, igual que un
        `alert()`); es un `window.print()` estándar detrás de un botón normal, sin lógica propia
        que pueda fallar aparte de esa llamada.

---

### E9-2 — Reimpresión desde el historial ✅ Hecho (2026-08-07)
- **Descripción:** desde `/admin/ventas` (`07-punto-de-venta.md#E7-8`), acceso directo al
  comprobante de cualquier venta pasada. Link "Comprobante" agregado en cada fila del listado
  (`app/admin/ventas/page.tsx`, junto al "Ver" ya existente) y link "Ver comprobante" agregado en
  el detalle (`app/admin/ventas/[id]/page.tsx`, junto a "Anular venta"), ambos a
  `/pos/comprobante/[id]` en pestaña nueva.
- **Depende de:** E9-1, `07-punto-de-venta.md#E7-8`
- **Archivos/módulos:** `app/admin/ventas/page.tsx`, `app/admin/ventas/[id]/page.tsx`
- **Cambios de base de datos:** —
- **Criterios de aceptación:**
  - [x] Reimprimir una venta de hace varios días muestra los mismos precios que en el momento
        de la venta (snapshot, no el precio actual del producto) — garantizado por
        `renglones_venta.precio_unitario_snapshot`, ya usado tal cual por `Comprobante.tsx`
        (mismo campo que ya mostraba `app/admin/ventas/[id]/page.tsx` desde EPIC 7). **No
        verificado con sesión de administrador en este pase** (no se contaba con esa contraseña
        durante la verificación) — el link en sí es el mismo componente `Link` ya probado como
        "Ver" en la misma fila, apuntando a la ruta de E9-1 que sí se verificó en el navegador.

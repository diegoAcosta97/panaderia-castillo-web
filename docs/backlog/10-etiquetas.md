# EPIC 10 — Etiquetas

Generación e impresión de etiquetas con código de barras, y el incremento de stock asociado
(RF-8).

---

### E10-1 — Esquema `etiqueta_lotes`
- **Descripción:** tabla `etiqueta_lotes` (ver `docs/data-model.md`).
- **Depende de:** `03-productos.md#E3-2`, `03-productos.md#E3-3`
- **Archivos/módulos:** `supabase/migrations/..._create_etiqueta_lotes.sql`
- **Cambios de base de datos:** `create table etiqueta_lotes`
- **Criterios de aceptación:**
  - [ ] Existe la tabla con FK a `productos`

---

### E10-2 — Función de generación de lote + incremento de stock
- **Descripción:** función `SECURITY DEFINER` `generar_lote_etiquetas(producto_id, cantidad,
  fecha_vencimiento)`: crea el lote y, si `productos.controla_stock`, incrementa
  `stock_actual` en `cantidad` y crea el `movimientos_stock` correspondiente (tipo
  `etiqueta_generada`), todo en una transacción (RF-8.2).
- **Depende de:** E10-1
- **Archivos/módulos:** `supabase/migrations/..._create_generar_lote_etiquetas_function.sql`
- **Cambios de base de datos:** función `generar_lote_etiquetas`
- **Criterios de aceptación:**
  - [ ] Generar 20 etiquetas de un producto que controla stock suma 20 a su `stock_actual` en
        la misma operación
  - [ ] Generar etiquetas de un producto de panadería (`controla_stock = false`) no crea
        movimiento de stock

---

### E10-3 — Pantalla de generación de etiquetas
- **Descripción:** en `/pos/etiquetas`, elegir producto (reutiliza `03-productos.md#E3-7`),
  cantidad, fecha de vencimiento (prellenada si el producto tiene `dias_vencimiento_default`),
  genera el lote.
- **Depende de:** E10-2, `03-productos.md#E3-7`
- **Archivos/módulos:** `app/pos/etiquetas/page.tsx`, `features/etiquetas/*`
- **Cambios de base de datos:** —
- **Criterios de aceptación:**
  - [ ] Generar un lote deja el stock actualizado visible en la pantalla de productos
        (`03-productos.md#E3-5`)

---

### E10-4 — Impresión de hoja A4 con grilla de etiquetas
- **Descripción:** vista `@media print` con grilla de etiquetas (nombre, fecha de vencimiento,
  precio, código de barras vía `lib/barcode.ts`/`jsbarcode`) según la `cantidad` generada, lista
  para imprimir y recortar (RF-8.3). El código de barras impreso es el del producto, no uno por
  lote (ver nota en `docs/data-model.md`).
- **Depende de:** E10-3
- **Archivos/módulos:** `features/etiquetas/components/{Etiqueta,HojaEtiquetas}.tsx`,
  `lib/barcode.ts`
- **Cambios de base de datos:** —
- **Criterios de aceptación:**
  - [ ] Imprimir un lote de 20 etiquetas se ve prolijo en una hoja A4 y cada código de barras
        escanea el producto correcto

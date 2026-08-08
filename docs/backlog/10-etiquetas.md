# EPIC 10 — Etiquetas

Generación e impresión de etiquetas con código de barras, y el incremento de stock asociado
(RF-8).

---

### E10-1 — Esquema `etiqueta_lotes` ✅ Hecho (2026-08-08)
- **Descripción:** tabla `etiqueta_lotes` (ver `docs/data-model.md`). Lectura abierta a
  cualquier autenticado (mismo criterio que `productos`/`movimientos_stock`, sin dato sensible);
  sin policy de insert/update para `authenticated` — solo escribe `generar_lote_etiquetas`
  (E10-2, `SECURITY DEFINER`).
- **Depende de:** `03-productos.md#E3-2`, `03-productos.md#E3-3`
- **Archivos/módulos:** `supabase/migrations/20260807180000_create_etiqueta_lotes.sql`
- **Cambios de base de datos:** `create table etiqueta_lotes`
- **Criterios de aceptación:**
  - [x] Existe la tabla con FK a `productos` — aplicada contra la base real con `npm run db:migrate`

---

### E10-2 — Función de generación de lote + incremento de stock ✅ Hecho (2026-08-08)
- **Descripción:** función `SECURITY DEFINER` `generar_lote_etiquetas(producto_id, cantidad,
  fecha_vencimiento)`: crea el lote y, si `productos.controla_stock`, incrementa
  `stock_actual` en `cantidad` y crea el `movimientos_stock` correspondiente (tipo
  `etiqueta_generada`), todo en una transacción (RF-8.2). Mismo patrón que `confirmar_venta`:
  bloquea la fila del producto (`for update`) antes de leer/actualizar su stock.
- **Depende de:** E10-1
- **Archivos/módulos:**
  `supabase/migrations/20260807180005_create_generar_lote_etiquetas_function.sql`
- **Cambios de base de datos:** función `generar_lote_etiquetas`
- **Criterios de aceptación:**
  - [x] Generar 5 etiquetas de un producto que controla stock (arrancó en 5) suma 5 a su
        `stock_actual` en la misma operación — verificado contra la base real: `stock_actual`
        quedó en 10, con un `movimientos_stock` (`tipo = 'etiqueta_generada'`, `cantidad = 5`,
        `stock_resultante = 10`, `referencia_id` apuntando al lote) y el `etiqueta_lotes`
        correspondiente
  - [x] Generar etiquetas de un producto de panadería (`controla_stock = false`) no crea
        movimiento de stock — verificado contra la base real (RPC llamada con la sesión real del
        cajero de prueba): `movimientos_stock` quedó vacío para ese producto y `stock_actual`
        siguió en `null`

---

### E10-3 — Pantalla de generación de etiquetas ✅ Hecho (2026-08-08)
- **Descripción:** en `/pos/etiquetas` (`app/pos/(operacion)/etiquetas/page.tsx` — dentro del
  route group `(operacion)`, mismo criterio que `/pos/gastos`: bloqueado sin turno de caja
  abierto, ver el comentario de `PosOperacionLayout` en `00-fundamentos.md`/`04-caja.md#E4-2`),
  elegir producto reutilizando `ScannerInput`/`useBuscarProducto` (`03-productos.md#E3-7`, el
  mismo componente de EPIC 7), cantidad, fecha de vencimiento (prellenada con
  `hoy + dias_vencimiento_default` si el producto lo tiene configurado), genera el lote. Agregado
  un link "Etiquetas" en el header de `/pos` (`app/pos/(operacion)/page.tsx`), junto a "Caja" y
  "Gastos".
- **Depende de:** E10-2, `03-productos.md#E3-7`
- **Archivos/módulos:** `app/pos/(operacion)/etiquetas/page.tsx`,
  `features/etiquetas/components/PantallaEtiquetas.tsx`,
  `features/etiquetas/hooks/useGenerarLote.ts`, `app/pos/(operacion)/page.tsx`
- **Cambios de base de datos:** —
- **Criterios de aceptación:**
  - [x] Generar un lote deja el stock actualizado en `productos.stock_actual` (el mismo registro
        que lee `/admin/productos`) — confirmado vía consulta directa a la base tras generar el
        lote (ver E10-2). **No verificado abriendo `/admin/productos` en el navegador** en este
        pase (no se contaba con la contraseña de administrador).

---

### E10-4 — Impresión de hoja A4 con grilla de etiquetas ✅ Hecho (2026-08-08)
- **Descripción:** grilla de etiquetas (nombre, precio, fecha de vencimiento, código de barras)
  según la `cantidad` generada, con la variante `print:` de Tailwind (equivalente a
  `@media print`) para quedar lista para imprimir y recortar (RF-8.3) — mismo patrón sin CSS
  aparte que EPIC 9. `lib/barcode.ts` gana `renderizarCodigoBarras(svg, valor)`, que dibuja sobre
  un `<svg>` con `jsbarcode` (dependencia nueva). El código de barras impreso es el del producto,
  no uno por lote (ver nota en `docs/data-model.md`).
  **Decisión no listada originalmente en la tarea:** formato **CODE128** en vez de EAN-13.
  `productos.codigo_barras` puede haber sido cargado a mano con cualquier formato (no solo los
  generados por `generarCodigoBarrasInterno`, que sí son EAN-13 válidos) — EAN-13 de `jsbarcode`
  tira error ante cualquier valor que no sea exactamente 12-13 dígitos con checksum válido,
  mientras que CODE128 acepta cualquier texto y lo escanea el mismo lector USB ya usado en el
  resto de la app (búsqueda exacta por string en `codigo_barras`, sin lógica de formato).
- **Depende de:** E10-3
- **Archivos/módulos:** `features/etiquetas/components/{Etiqueta,HojaEtiquetas,BotonImprimir}.tsx`,
  `lib/barcode.ts`, `lib/print.ts` (reutilizado de EPIC 9)
- **Cambios de base de datos:** —
- **Criterios de aceptación:**
  - [x] Imprimir un lote se ve prolijo — verificado en un navegador real (Chrome, cajero
        logueado): lote de 5 etiquetas de un producto de prueba, grilla de 3 columnas con
        nombre/precio/fecha de vencimiento/código de barras legible por etiqueta.
        **No verificado con 20 etiquetas ni con un escáner físico real** — el código de barras se
        vio nítido en pantalla (CODE128 con el texto exacto de `codigo_barras` debajo, formato
        estándar y ampliamente soportado por lectores USB) pero no se confirmó un escaneo físico
        de punta a punta.

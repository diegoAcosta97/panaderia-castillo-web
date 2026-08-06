# EPIC 3 — Productos, categorías y stock

Catálogo del comercio y el registro base de movimientos de stock, usado luego por ventas
(EPIC 7), etiquetas (EPIC 10) y control periódico (EPIC 11).

---

### E3-1 — Esquema `categorias`
- **Descripción:** tabla `categorias` (ver `docs/data-model.md`).
- **Depende de:** `00-fundamentos.md#E0-3`
- **Archivos/módulos:** `supabase/migrations/..._create_categorias.sql`
- **Cambios de base de datos:** `create table categorias`
- **Criterios de aceptación:**
  - [ ] Existe la tabla con constraint de nombre único

---

### E3-2 — Esquema `productos`
- **Descripción:** enum `tipo_venta_producto`, tabla `productos` (ver `docs/data-model.md`),
  constraint check de `stock_actual` entero cuando `tipo_venta = 'unidad'`.
- **Depende de:** E3-1
- **Archivos/módulos:** `supabase/migrations/..._create_productos.sql`
- **Cambios de base de datos:** `create type tipo_venta_producto`, `create table productos`
- **Criterios de aceptación:**
  - [ ] Insertar un producto `tipo_venta = 'unidad'` con `stock_actual` decimal falla por
        constraint

---

### E3-3 — Esquema `movimientos_stock`
- **Descripción:** enum `tipo_movimiento_stock`, tabla `movimientos_stock` (ver
  `docs/data-model.md`).
- **Depende de:** E3-2
- **Archivos/módulos:** `supabase/migrations/..._create_movimientos_stock.sql`
- **Cambios de base de datos:** `create type tipo_movimiento_stock`,
  `create table movimientos_stock`
- **Criterios de aceptación:**
  - [ ] Existe la tabla con FK a `productos` y `perfiles`

---

### E3-4 — CRUD de categorías (admin)
- **Descripción:** alta/edición/baja lógica y listado de categorías en
  `/admin/productos/categorias`.
- **Depende de:** E3-1, `02-roles.md#E2-2`
- **Archivos/módulos:** `app/admin/productos/categorias/*`, `features/productos/*`,
  `repositories/categoriasRepository.ts`
- **Cambios de base de datos:** —
- **Criterios de aceptación:**
  - [ ] Crear, editar y desactivar una categoría desde la UI

---

### E3-5 — CRUD de productos (admin)
- **Objetivo:** alta/edición/baja lógica y búsqueda de productos, con las reglas de RF-1.
- **Descripción:** `/admin/productos`. Asignación automática de `codigo_barras` interno si no
  se completa uno manualmente (RF-1.5). `tipo_venta` fijo tras la creación (no editable — un
  producto no puede pasar de "por unidad" a "por peso" con historial de ventas ya cargado; a
  reforzar en la validación del formulario). Toggle `controla_stock` con default según la
  categoría elegida (panadería → `false`), editable igual.
- **Depende de:** E3-2, `02-roles.md#E2-2`
- **Archivos/módulos:** `app/admin/productos/*`, `features/productos/*`,
  `repositories/productosRepository.ts`, `lib/barcode.ts`
- **Cambios de base de datos:** —
- **Criterios de aceptación:**
  - [ ] Crear un producto sin código de barras le asigna uno interno único automáticamente
  - [ ] Un producto con `controla_stock = false` no muestra ni pide campos de stock

---

### E3-6 — Listado de reposición (stock bajo)
- **Descripción:** vista en `/admin/productos/reposicion` que filtra productos con
  `stock_actual < stock_minimo` (RF-1.4).
- **Depende de:** E3-5
- **Archivos/módulos:** `app/admin/productos/reposicion/page.tsx`,
  `repositories/productosRepository.ts`
- **Cambios de base de datos:** —
- **Criterios de aceptación:**
  - [ ] Un producto por debajo de su mínimo aparece en el listado; uno por encima, no

---

### E3-7 — Búsqueda de producto por código de barras / nombre (reutilizable)
- **Objetivo:** un único punto de búsqueda de producto, reutilizado por el punto de venta
  (EPIC 7) y por etiquetas (EPIC 10).
- **Descripción:** `features/productos/hooks/useBuscarProducto.ts` — búsqueda exacta por
  código de barras (para el lector USB) y por nombre parcial (para búsqueda manual).
- **Depende de:** E3-5
- **Archivos/módulos:** `features/productos/hooks/useBuscarProducto.ts`,
  `repositories/productosRepository.ts`
- **Cambios de base de datos:** —
- **Criterios de aceptación:**
  - [ ] Buscar por código de barras exacto devuelve un único producto rápido (índice sobre
        `codigo_barras`)

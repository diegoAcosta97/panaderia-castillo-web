# EPIC 3 — Productos, categorías y stock

Catálogo del comercio y el registro base de movimientos de stock, usado luego por ventas
(EPIC 7), etiquetas (EPIC 10) y control periódico (EPIC 11).

---

### E3-1 — Esquema `categorias` ✅ Hecho (2026-08-06)
- **Descripción:** tabla `categorias` (ver `docs/data-model.md`). RLS: lectura para cualquier
  autenticado, escritura solo administrador (`is_administrador()`, `02-roles.md#E2-4`).
- **Depende de:** `00-fundamentos.md#E0-3`
- **Archivos/módulos:** `supabase/migrations/20260806194555_create_categorias.sql`
- **Cambios de base de datos:** `create table categorias`
- **Criterios de aceptación:**
  - [x] Existe la tabla con constraint de nombre único

---

### E3-2 — Esquema `productos` ✅ Hecho (2026-08-06)
- **Descripción:** enum `tipo_venta_producto`, tabla `productos` (ver `docs/data-model.md`),
  constraint check de `stock_actual` entero cuando `tipo_venta = 'unidad'`. Misma política de
  RLS que `categorias`.
- **Depende de:** E3-1
- **Archivos/módulos:** `supabase/migrations/20260806194600_create_productos.sql`
- **Cambios de base de datos:** `create type tipo_venta_producto`, `create table productos`
- **Criterios de aceptación:**
  - [x] Insertar un producto `tipo_venta = 'unidad'` con `stock_actual` decimal falla por
        constraint — verificado con un insert real (`3.5` con `tipo_venta='unidad'` → rechazado)

---

### E3-3 — Esquema `movimientos_stock` ✅ Hecho (2026-08-06)
- **Descripción:** enum `tipo_movimiento_stock`, tabla `movimientos_stock` (ver
  `docs/data-model.md`). Sin policy de insert para `authenticated`: solo lo van a escribir
  funciones `SECURITY DEFINER` de epics futuras (7, 10, 11), que bypasean RLS igual que
  `handle_new_user` en `00-fundamentos.md#E0-4`. Solo lectura para administrador (auditoría).
- **Depende de:** E3-2
- **Archivos/módulos:** `supabase/migrations/20260806194605_create_movimientos_stock.sql`
- **Cambios de base de datos:** `create type tipo_movimiento_stock`,
  `create table movimientos_stock`
- **Criterios de aceptación:**
  - [x] Existe la tabla con FK a `productos` y `perfiles`

---

### E3-4 — CRUD de categorías (admin) ✅ Hecho (2026-08-06)
- **Descripción:** alta (diálogo) y edición inline (nombre + activo) en
  `/admin/productos/categorias`, mismo patrón que `/admin/usuarios` de EPIC 2.
- **Depende de:** E3-1, `02-roles.md#E2-2`
- **Archivos/módulos:** `app/admin/productos/categorias/page.tsx`,
  `features/productos/{actions.ts,components/{NuevaCategoriaDialog,CategoriasTable}.tsx}`,
  `repositories/categoriasRepository.ts`
- **Cambios de base de datos:** —
- **Criterios de aceptación:**
  - [x] Crear, editar y desactivar una categoría desde la UI

---

### E3-5 — CRUD de productos (admin) ✅ Hecho (2026-08-06)
- **Objetivo:** alta/edición/baja lógica y búsqueda de productos, con las reglas de RF-1.
- **Descripción:** `/admin/productos` (`ProductoDialog` para alta/edición, `ProductosTable` para
  el listado). `codigo_barras` se genera automáticamente (`lib/barcode.ts`, prefijo "20"–"29"
  reservado por GS1 para uso interno + dígito verificador EAN-13 válido, con reintento ante
  colisión — `productosRepository.crearProducto`) si se deja vacío. `tipo_venta` deshabilitado
  en edición. Default de `controla_stock` según si el nombre de categoría elegida contiene
  "panader" (heurística de UX, editable igual).
- **Depende de:** E3-2, `02-roles.md#E2-2`
- **Archivos/módulos:** `app/admin/productos/page.tsx`,
  `features/productos/components/{ProductoDialog,ProductosTable}.tsx`,
  `repositories/productosRepository.ts`, `lib/barcode.ts`
- **Cambios de base de datos:** —
- **Criterios de aceptación:**
  - [x] Crear un producto sin código de barras le asigna uno interno único automáticamente —
        verificado con inserts reales + constraint unique rechazando un duplicado a propósito
        (`23505`)
  - [x] Un producto con `controla_stock = false` no muestra ni pide campos de stock — por
        diseño en `ProductoDialog` (el bloque de `stock_minimo` solo se renderiza si
        `controlaStock` está tildado); verificado que `stock_actual` queda `null` al crear con
        `controla_stock = false`

**Borrado real desde el listado (2026-08-20):** además de la baja lógica (`activo = false`), se
agregó poder eliminar un producto de verdad desde `/admin/productos`, con confirmación (RF
pedido explícitamente: "antes de eliminar que me pida confirmacion") vía
`EliminarProductoDialog`. Solo admin (`productos_delete_admin`, política nueva -- la tabla no
tenía ninguna policy de `delete` hasta acá). Sin función `SECURITY DEFINER`: un `delete` directo
alcanza porque las FKs de `renglones_venta`/`movimientos_stock`/`control_stock_detalles`/
`ingreso_mercaderia_items`/`etiqueta_lotes`/`oferta_items`/`descuento_condiciones`/
`pedido_encargo_items`/`bloqueo_caja_*` (todas sin `on delete cascade`) ya rechazan el borrado si
el producto tiene cualquier historial -- ese error de FK (`23503`) se traduce a un mensaje claro
("Desactivalo en cambio") en la Server Action en vez de dejarlo como un error crudo de Postgres.
Verificado contra la base real: un cajero no puede borrar (RLS, 0 filas afectadas); un admin
puede borrar un producto sin historial; un admin NO puede borrar un producto con un
`movimientos_stock` asociado (rechazado con `23503`, mensaje traducido).
- **Archivos/módulos:** `supabase/migrations/20260820090000_productos_delete_admin.sql`,
  `repositories/productosRepository.ts` (`eliminarProducto`), `features/productos/actions.ts`
  (`eliminarProducto`), `features/productos/components/EliminarProductoDialog.tsx`,
  `lib/errors.ts` (`POSTGRES_FOREIGN_KEY_VIOLATION`)

---

### E3-6 — Listado de reposición (stock bajo) ✅ Hecho (2026-08-06)
- **Descripción:** vista en `/admin/productos/reposicion` que filtra productos con
  `stock_actual < stock_minimo` (RF-1.4). El filtro se resuelve en el cliente (comparar dos
  columnas de la misma fila no es algo que el query builder de PostgREST resuelva con un valor
  literal) — a esta escala de catálogo no hace falta una vista/función solo para esto.
- **Depende de:** E3-5
- **Archivos/módulos:** `app/admin/productos/reposicion/page.tsx`,
  `repositories/productosRepository.ts` (`listProductosBajoStock`)
- **Cambios de base de datos:** —
- **Criterios de aceptación:**
  - [x] Un producto por debajo de su mínimo aparece en el listado; uno por encima, no —
        verificado con datos reales (producto con stock 2/mínimo 5 apareció; ninguno de los
        demás productos de prueba, sin mínimo configurado, apareció)

---

### E3-7 — Búsqueda de producto por código de barras / nombre (reutilizable) ✅ Hecho (2026-08-06)
- **Objetivo:** un único punto de búsqueda de producto, reutilizado por el punto de venta
  (EPIC 7) y por etiquetas (EPIC 10).
- **Descripción:** `features/productos/hooks/useBuscarProducto.ts` — búsqueda exacta por
  código de barras (para el lector USB) y por nombre parcial (para búsqueda manual), sobre
  `productosRepository.{buscarPorCodigoBarras,buscarPorNombre}`.
- **Depende de:** E3-5
- **Archivos/módulos:** `features/productos/hooks/useBuscarProducto.ts`,
  `repositories/productosRepository.ts`
- **Cambios de base de datos:** —
- **Criterios de aceptación:**
  - [x] Buscar por código de barras exacto devuelve un único producto rápido (índice sobre
        `codigo_barras`, provisto por el `unique` de E3-2) — verificado con datos reales
  - [x] Búsqueda por nombre parcial (`ilike`) devuelve las coincidencias esperadas — verificado

---

## Nota de seguridad verificada (2026-08-06)

Con un usuario cajero de prueba real (creado y borrado en la misma verificación): puede **leer**
productos (necesario para el punto de venta futuro) pero **no puede crear** uno — el intento de
`insert` fue rechazado por RLS (`"new row violates row-level security policy for table
productos"`), confirmando que `productos_insert_admin`/`categorias_insert_admin` funcionan como
se diseñaron.

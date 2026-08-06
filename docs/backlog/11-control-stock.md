# EPIC 11 — Control periódico de stock

Conteo físico vs. sistema, con aprobación separada del ajuste (RF-9).

---

### E11-1 — Esquema `controles_stock`, `control_stock_detalles`
- **Descripción:** enum `estado_control_stock`, ambas tablas (ver `docs/data-model.md`).
- **Depende de:** `03-productos.md#E3-2`, `03-productos.md#E3-3`
- **Archivos/módulos:** `supabase/migrations/..._create_control_stock.sql`
- **Cambios de base de datos:** `create type estado_control_stock`, 2 tablas nuevas
- **Criterios de aceptación:**
  - [ ] Existen ambas tablas con sus FKs

---

### E11-2 — Iniciar y cargar un conteo
- **Descripción:** pantalla que lista todos los productos con `controla_stock = true`, toma
  `stock_sistema` como snapshot al iniciar, y permite ingresar `stock_contado` producto por
  producto; al finalizar, pasa a `estado = 'pendiente_aprobacion'` (RF-9.1, RF-9.2).
- **Depende de:** E11-1
- **Archivos/módulos:** `app/admin/control-stock/nuevo/page.tsx`, `features/control-stock/*`
- **Cambios de base de datos:** —
- **Criterios de aceptación:**
  - [ ] Las diferencias (`stock_contado - stock_sistema`) se calculan y muestran correctamente
        al cerrar el conteo

---

### E11-3 — Función de aprobación con ajuste de stock
- **Descripción:** función `SECURITY DEFINER` `aprobar_control_stock(control_stock_id,
  aprobador_id)`: por cada detalle con diferencia ≠ 0, actualiza `productos.stock_actual` y
  crea `movimientos_stock` tipo `ajuste_control_stock`, y marca el control como `aprobado`. El
  ajuste **nunca** es automático al cargar el conteo (RF-9.4).
- **Depende de:** E11-2
- **Archivos/módulos:** `supabase/migrations/..._create_aprobar_control_stock_function.sql`
- **Cambios de base de datos:** función `aprobar_control_stock`
- **Criterios de aceptación:**
  - [ ] Un conteo en `pendiente_aprobacion` no modifica ningún stock hasta que se aprueba
        explícitamente
  - [ ] Al aprobar, el stock de cada producto con diferencia queda igual al `stock_contado`

---

### E11-4 — Pantalla de aprobación/rechazo (admin)
- **Descripción:** `/admin/control-stock/[id]` — revisión de diferencias, botón aprobar (llama
  a E11-3) o rechazar (queda registrado para análisis sin tocar stock).
- **Depende de:** E11-3, `02-roles.md#E2-2`
- **Archivos/módulos:** `app/admin/control-stock/[id]/page.tsx`
- **Cambios de base de datos:** —
- **Criterios de aceptación:**
  - [ ] Solo el administrador puede aprobar/rechazar un conteo

---

### E11-5 — Historial de controles de stock
- **Descripción:** listado en `/admin/control-stock` de conteos pasados con sus diferencias,
  para analizar faltantes recurrentes por producto (RF-9.3).
- **Depende de:** E11-4
- **Archivos/módulos:** `app/admin/control-stock/page.tsx`
- **Cambios de base de datos:** —
- **Criterios de aceptación:**
  - [ ] El listado permite ver, para un producto dado, su historial de diferencias a lo largo
        de varios conteos

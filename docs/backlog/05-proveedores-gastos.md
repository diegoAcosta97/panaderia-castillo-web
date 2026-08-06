# EPIC 5 — Proveedores y gastos

Catálogo de proveedores y registro de gastos, siempre asociados al turno de caja abierto
(RF-6).

---

### E5-1 — Esquema `proveedores`
- **Descripción:** tabla `proveedores` (ver `docs/data-model.md`).
- **Depende de:** `00-fundamentos.md#E0-3`
- **Archivos/módulos:** `supabase/migrations/..._create_proveedores.sql`
- **Cambios de base de datos:** `create table proveedores`
- **Criterios de aceptación:**
  - [ ] Existe la tabla

---

### E5-2 — Esquema `gastos`
- **Descripción:** tabla `gastos` (ver `docs/data-model.md`), FK a `caja_turnos` y
  `proveedores` — todo gasto sale del turno abierto en ese momento (RF-6.3).
- **Depende de:** E5-1, `04-caja.md#E4-1`
- **Archivos/módulos:** `supabase/migrations/..._create_gastos.sql`
- **Cambios de base de datos:** `create table gastos`
- **Criterios de aceptación:**
  - [ ] Un gasto no puede crearse sin un `caja_turno_id` de un turno en estado `abierta`
        (validado en servicio, ya que la FK sola no alcanza para chequear el estado)

---

### E5-3 — CRUD de proveedores (admin)
- **Descripción:** alta/edición/baja lógica de proveedores en `/admin/proveedores`.
- **Depende de:** E5-1, `02-roles.md#E2-2`
- **Archivos/módulos:** `app/admin/proveedores/*`, `repositories/proveedoresRepository.ts`
- **Cambios de base de datos:** —
- **Criterios de aceptación:**
  - [ ] Crear, editar y desactivar un proveedor

---

### E5-4 — Alta de gasto (cajero y administrador)
- **Descripción:** formulario en `/pos/gastos`, accesible con un turno abierto, y también
  disponible desde `/admin`. Solo permite cargar contra el turno actualmente abierto (RF-6.2).
- **Depende de:** E5-2, E5-3
- **Archivos/módulos:** `app/pos/gastos/page.tsx`, `features/gastos/*`,
  `repositories/gastosRepository.ts`
- **Cambios de base de datos:** —
- **Criterios de aceptación:**
  - [ ] Un cajero puede registrar un gasto durante su turno
  - [ ] Ese gasto impacta el cálculo de `efectivo_esperado` del cierre (`04-caja.md#E4-3`)

---

### E5-5 — Reporte de gastos (admin)
- **Descripción:** listado/filtro de gastos por período y por proveedor en `/admin/gastos`
  (RF-6.4).
- **Depende de:** E5-4, `02-roles.md#E2-2`
- **Archivos/módulos:** `app/admin/gastos/page.tsx`
- **Cambios de base de datos:** —
- **Criterios de aceptación:**
  - [ ] Filtrar por proveedor y por rango de fechas devuelve los gastos correctos

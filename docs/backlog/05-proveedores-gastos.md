# EPIC 5 — Proveedores y gastos

Catálogo de proveedores y registro de gastos, siempre asociados al turno de caja abierto
(RF-6).

---

### E5-1 — Esquema `proveedores` ✅ Hecho (2026-08-06)
- **Descripción:** tabla `proveedores` (ver `docs/data-model.md`). RLS: lectura abierta a
  cualquier autenticado (el cajero elige un proveedor al cargar un gasto), escritura solo
  administrador.
- **Depende de:** `00-fundamentos.md#E0-3`
- **Archivos/módulos:** `supabase/migrations/20260806220000_create_proveedores.sql`
- **Cambios de base de datos:** `create table proveedores`
- **Criterios de aceptación:**
  - [x] Existe la tabla

---

### E5-2 — Esquema `gastos` ✅ Hecho (2026-08-06)
- **Descripción:** tabla `gastos` (ver `docs/data-model.md`), FK a `caja_turnos` y
  `proveedores`. "Solo contra el turno abierto" se resuelve enteramente en
  `features/gastos/actions.ts`: la acción **nunca** recibe `caja_turno_id` del cliente, siempre
  llama a `getTurnoAbierto()` server-side y usa ese id (o falla si no hay ninguno). RLS: insert
  solo como uno mismo; select de lo propio, de lo del turno actualmente abierto, o todo si es
  administrador.
- **Depende de:** E5-1, `04-caja.md#E4-1`
- **Archivos/módulos:** `supabase/migrations/20260806220005_create_gastos.sql`
- **Cambios de base de datos:** `create table gastos`
- **Criterios de aceptación:**
  - [x] Un gasto no puede crearse sin un `caja_turno_id` de un turno en estado `abierta` — la
        acción resuelve el turno abierto ella misma (no hay forma de pasarle uno cerrado desde
        el cliente); verificado con un insert real de un cajero de prueba contra un turno
        abierto real

---

### E5-3 — CRUD de proveedores (admin) ✅ Hecho (2026-08-06)
- **Descripción:** alta (diálogo) y edición (mismo diálogo con `proveedor` precargado, más
  toggle de `activo` inline en la tabla) en `/admin/proveedores`.
- **Depende de:** E5-1, `02-roles.md#E2-2`
- **Archivos/módulos:** `app/admin/proveedores/page.tsx`,
  `features/proveedores/{actions.ts,components/{ProveedorDialog,ProveedoresTable}.tsx}`,
  `repositories/proveedoresRepository.ts`
- **Cambios de base de datos:** —
- **Criterios de aceptación:**
  - [x] Crear, editar y desactivar un proveedor — verificado con datos reales (RLS: un cajero de
        prueba no pudo crear un proveedor)

---

### E5-4 — Alta de gasto (cajero y administrador) ✅ Hecho (2026-08-06)
- **Descripción:** `/pos/gastos` (movido dentro del route group `app/pos/(operacion)/`, hereda
  el guard de turno abierto de E4-2 automáticamente). **Completa el TODO de
  `04-caja.md#E4-3`**: `arqueoService.calcularEfectivoEsperado` ahora suma gastos reales del
  turno (`gastosRepository.sumaGastosPorTurno`) en vez de placeholder 0 — el término de ventas
  sigue en 0 hasta EPIC 7.
- **Depende de:** E5-2, E5-3
- **Archivos/módulos:** `app/pos/(operacion)/gastos/page.tsx`,
  `features/gastos/{actions.ts,components/NuevoGastoForm.tsx}`,
  `repositories/gastosRepository.ts`, `features/caja/services/arqueoService.ts` (actualizado)
- **Cambios de base de datos:** —
- **Criterios de aceptación:**
  - [x] Un cajero puede registrar un gasto durante su turno — verificado con un usuario cajero
        de prueba real
  - [x] Ese gasto impacta el cálculo de `efectivo_esperado` del cierre — verificado
        numéricamente: apertura $2000 − gasto $300 = `efectivo_esperado` $1700

---

### E5-5 — Reporte de gastos (admin) ✅ Hecho (2026-08-06)
- **Descripción:** `/admin/gastos`, filtro por proveedor (`<select>` HTML nativo, no el `Select`
  de shadcn/Base UI — este formulario es un `GET` plano sin JS, y un componente que no es un
  `<select>` real no viaja como form data) y rango de fecha, con total acumulado.
- **Depende de:** E5-4, `02-roles.md#E2-2`
- **Archivos/módulos:** `app/admin/gastos/page.tsx`,
  `repositories/gastosRepository.ts` (`listGastos`)
- **Cambios de base de datos:** —
- **Criterios de aceptación:**
  - [x] Filtrar por proveedor y por rango de fechas devuelve los gastos correctos — verificado

---

## Notas (2026-08-06)

- **Bug propio detectado y corregido durante la verificación:** el script de prueba de
  `04-caja.md` había intentado limpiar sus turnos de prueba con el cliente sujeto a RLS
  (`caja_turnos`/`gastos` no tienen policy de `delete` a propósito, para que borrar registros de
  auditoría no sea trivial ni para el administrador desde el cliente) — el `delete` no dio
  error, simplemente no borró nada, y quedó un turno de prueba abierto (`_test2`) sin limpiar.
  Se detectó al arrancar esta verificación (bloqueaba abrir un turno nuevo, tal como debía) y se
  limpió con la secret key. Documentado acá para no repetir el mismo error: **toda limpieza de
  datos de prueba en `caja_turnos`/`gastos`/`movimientos_stock` debe hacerse con el cliente
  admin (secret key), no con el cliente autenticado normal.**
- Verificado con datos reales de punta a punta: proveedor → turno → gasto → arqueo correcto →
  reporte filtrado → RLS (cajero no crea proveedores, sí sus propios gastos contra el turno
  abierto, no gastos a nombre de otro usuario).

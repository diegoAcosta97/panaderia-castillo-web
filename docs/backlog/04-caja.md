# EPIC 4 — Caja

Apertura, cierre y arqueo de turno. Caja única del local, turnos secuenciales (RF-5).

---

### E4-1 — Esquema `caja_turnos`
- **Descripción:** enum `estado_caja_turno`, tabla `caja_turnos` (ver `docs/data-model.md`),
  índice único parcial que impide dos turnos `abierta` simultáneos (RF-5.5).
- **Depende de:** `00-fundamentos.md#E0-4`
- **Archivos/módulos:** `supabase/migrations/..._create_caja_turnos.sql`
- **Cambios de base de datos:** `create type estado_caja_turno`, `create table caja_turnos`,
  índice único parcial
- **Criterios de aceptación:**
  - [ ] Insertar un segundo `caja_turnos` con `estado = 'abierta'` mientras hay uno abierto falla

---

### E4-2 — Apertura de turno
- **Descripción:** pantalla en `/pos/caja` para abrir turno (monto inicial en efectivo).
  Bloquea el resto de `/pos` (venta, gastos, etiquetas) mientras no haya un turno abierto.
- **Depende de:** E4-1, `02-roles.md#E2-1`
- **Archivos/módulos:** `app/pos/caja/page.tsx`, `features/caja/*`,
  `repositories/cajaTurnosRepository.ts`
- **Cambios de base de datos:** —
- **Criterios de aceptación:**
  - [ ] No se puede abrir un turno si ya hay uno abierto (error claro, no un 500)
  - [ ] Sin turno abierto, entrar a `/pos` redirige a la pantalla de apertura

---

### E4-3 — Cierre de turno (arqueo)
- **Descripción:** pantalla de cierre: ingreso del efectivo contado, cálculo de
  `efectivo_esperado` (apertura + ventas efectivo − gastos efectivo) y `diferencia` (RF-5.4).
  **Nota de orden de ejecución:** el cálculo real depende de que existan ventas (EPIC 7) y
  gastos (EPIC 5); hasta entonces se puede implementar con placeholder 0 en esos dos términos y
  completarlo cuando esas epics estén listas (ver diagrama de orden en el `README.md` de este
  backlog).
- **Depende de:** E4-2
- **Archivos/módulos:** `app/pos/caja/cierre/page.tsx`, `features/caja/services/arqueoService.ts`
- **Cambios de base de datos:** función SQL `calcular_efectivo_esperado(caja_turno_id)` (o
  cálculo equivalente en `services/`)
- **Criterios de aceptación:**
  - [ ] Cerrar el turno persiste `monto_cierre_declarado`, `efectivo_esperado` y `diferencia`
  - [ ] Tras cerrar, el turno pasa a `estado = 'cerrada'` y no admite más ventas ni gastos

---

### E4-4 — Historial de turnos (admin)
- **Descripción:** listado en `/admin/caja` de todos los turnos con sus diferencias, filtrable
  por fecha (RF-5.6).
- **Depende de:** E4-3, `02-roles.md#E2-2`
- **Archivos/módulos:** `app/admin/caja/page.tsx`
- **Cambios de base de datos:** —
- **Criterios de aceptación:**
  - [ ] Un cajero no tiene acceso a esta pantalla; solo el administrador

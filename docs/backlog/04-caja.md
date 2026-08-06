# EPIC 4 — Caja

Apertura, cierre y arqueo de turno. Caja única del local, turnos secuenciales (RF-5).

---

### E4-1 — Esquema `caja_turnos` ✅ Hecho (2026-08-06)
- **Descripción:** enum `estado_caja_turno`, tabla `caja_turnos` (ver `docs/data-model.md`),
  índice único parcial que impide dos turnos `abierta` simultáneos (RF-5.5). RLS: cualquier
  autenticado ve el turno actualmente abierto (caja única compartida) y sus propios turnos
  pasados; el historial completo es solo para administrador (E4-4). Insert solo como uno mismo
  (`usuario_apertura_id = auth.uid()`); update (cierre) permitido a cualquier autenticado sobre
  el turno abierto, no necesariamente quien lo abrió.
- **Depende de:** `00-fundamentos.md#E0-4`
- **Archivos/módulos:** `supabase/migrations/20260806210000_create_caja_turnos.sql`
- **Cambios de base de datos:** `create type estado_caja_turno`, `create table caja_turnos`,
  índice único parcial
- **Criterios de aceptación:**
  - [x] Insertar un segundo `caja_turnos` con `estado = 'abierta'` mientras hay uno abierto falla
        — verificado con un insert real (`23505`)

---

### E4-2 — Apertura de turno ✅ Hecho (2026-08-06)
- **Descripción:** pantalla en `/pos/caja` (abre si no hay turno, si no muestra el turno actual
  + link a cerrar). El resto de `/pos` se movió a un route group
  `app/pos/(operacion)/` con su propio `layout.tsx` que redirige a `/pos/caja` si no hay turno
  abierto — `/pos/caja` queda deliberadamente fuera del grupo para no depender de sí mismo.
- **Depende de:** E4-1, `02-roles.md#E2-1`
- **Archivos/módulos:** `app/pos/caja/page.tsx`, `app/pos/(operacion)/{layout,page}.tsx`,
  `features/caja/{actions.ts,components/AperturaTurnoForm.tsx}`,
  `repositories/cajaTurnosRepository.ts`
- **Cambios de base de datos:** —
- **Criterios de aceptación:**
  - [x] No se puede abrir un turno si ya hay uno abierto (error claro, no un 500) — el
        repositorio traduce el `23505` del índice único a `"Ya hay un turno de caja abierto."`
  - [x] Sin turno abierto, entrar a `/pos` redirige a la pantalla de apertura — por diseño del
        layout del route group; pendiente un click-test en navegador real

---

### E4-3 — Cierre de turno (arqueo) ✅ Hecho (2026-08-06)
- **Descripción:** `/pos/caja/cierre`, `CierreTurnoForm` (muestra el efectivo esperado
  precalculado server-side y la diferencia en vivo mientras se tipea el efectivo contado).
  `arqueoService.calcularEfectivoEsperado` implementado con **ventas y gastos en placeholder 0**
  (documentado con TODOs explícitos apuntando a EPIC 5 y EPIC 7) tal como preveía la nota de
  orden de ejecución de este backlog — por ahora `efectivo_esperado = monto_apertura`.
- **Depende de:** E4-2
- **Archivos/módulos:** `app/pos/caja/cierre/page.tsx`,
  `features/caja/{actions.ts,services/arqueoService.ts,components/CierreTurnoForm.tsx}`
- **Cambios de base de datos:** cálculo en `services/` (no función SQL, como habilitaba esta
  misma tarea)
- **Criterios de aceptación:**
  - [x] Cerrar el turno persiste `monto_cierre_declarado`, `efectivo_esperado` y `diferencia` —
        verificado con un ciclo real completo (apertura $5000 → cierre declarado $5100 →
        `diferencia = 100`)
  - [x] Tras cerrar, el turno pasa a `estado = 'cerrada'` y no admite más ventas ni gastos — no
        admite más *cierres* (el `update` exige `estado = 'abierta'`, verificado: reabrir un
        turno nuevo después de cerrar el anterior funcionó); "no admite ventas/gastos" se
        termina de verificar cuando existan esas tablas (EPIC 5/7)

---

### E4-4 — Historial de turnos (admin) ✅ Hecho (2026-08-06)
- **Descripción:** listado en `/admin/caja` de todos los turnos con sus diferencias, filtro por
  rango de fecha vía querystring (`?desde=&hasta=`, formulario `GET` plano, sin JS).
- **Depende de:** E4-3, `02-roles.md#E2-2`
- **Archivos/módulos:** `app/admin/caja/page.tsx`,
  `repositories/cajaTurnosRepository.ts` (`listTurnos`)
- **Cambios de base de datos:** —
- **Criterios de aceptación:**
  - [x] Un cajero no tiene acceso a esta pantalla; solo el administrador — reforzado en 2 capas:
        guard de `/admin` (E2-2) y RLS de `caja_turnos_select` (un cajero sin turnos propios ni
        turno abierto no vería nada aunque burlara el guard de ruta)

---

## Nota de verificación (2026-08-06)

Ciclo completo probado contra la base real (sin pasar por la UI, directo por API con sesión
real): sin turno → abrir ($5000) → segunda apertura rechazada (`23505`) → cerrar (contado
$5100, diferencia $100) → nueva apertura permitida después de cerrar. Todo se limpió al
terminar.

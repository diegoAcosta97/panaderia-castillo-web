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
  **Actualización (2026-08-06, `05-proveedores-gastos.md#E5-4`):** el término de gastos ya no
  es placeholder — `efectivo_esperado = monto_apertura + ventas_efectivo(0) −
  gastos_efectivo(real)`. Falta solo el término de ventas (EPIC 7).
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

### E4-5 — Bloqueo de caja: conteo sorpresivo obligatorio antes de cerrar ✅ Hecho (2026-08-17)
- **Objetivo:** que el administrador pueda forzar un control de stock sorpresivo (hasta 10
  productos elegidos por él, de cualquier categoría) que el cajero tiene que contar antes de
  poder cerrar su turno -- prendible/apagable, y la lista de productos se puede ir cambiando.
- **Descripción:** interruptor `configuracion_negocio.bloqueo_caja_activo` (columna en la fila
  única de config, mismo criterio que el resto de EPIC 12) + tabla `bloqueo_caja_productos`
  (hasta 10, el límite lo hace cumplir el propio `with check` del insert, no solo la UI) editable
  desde `/admin/bloqueo-caja`. El gate real vive dentro de `cerrar_turno` (SQL, no solo en la
  UI): si el bloqueo está prendido y hay al menos un producto elegido, exige que exista un
  `bloqueo_caja_conteos` para ese `caja_turno_id` antes de dejar cerrar -- si no hay ningún
  producto elegido, activar el interruptor no bloquea nada (un candado sin llave no bloquea).
  `registrar_conteo_bloqueo_caja` (`SECURITY DEFINER`, sin gate de admin -- lo carga el cajero
  que abrió el turno) exige contar exactamente la lista vigente, ni un producto de más ni de
  menos, y rechaza un segundo conteo para el mismo turno. A propósito **no ajusta stock ni pasa
  por ningún flujo de aprobación** -- es un registro de auditoría (sistema vs. contado, a
  ciegas, mismo criterio que el conteo de control de stock y que el cierre de caja) para que el
  administrador compare y detecte diferencias en `/admin/bloqueo-caja`, no un mecanismo de
  ajuste. `/pos/caja/cierre` redirige a `/pos/caja/cierre/conteo` si hace falta contar todavía
  (solo para no mostrarle al cajero un formulario que el servidor va a rechazar igual).
- **Depende de:** E4-3, `03-productos.md#E3-3`, `02-roles.md#E2-2`
- **Archivos/módulos:**
  `supabase/migrations/20260817100000_add_bloqueo_caja_config.sql`,
  `supabase/migrations/20260817100005_create_bloqueo_caja_tables.sql`,
  `supabase/migrations/20260817100010_create_registrar_conteo_bloqueo_caja_function.sql`,
  `supabase/migrations/20260817100015_cerrar_turno_bloqueo_caja.sql`,
  `repositories/{bloqueoCajaRepository,configuracionRepository}.ts`,
  `features/bloqueo-caja/{actions.ts,components/{BloqueoCajaConfig,ConteoBloqueoCajaForm}.tsx}`,
  `app/admin/bloqueo-caja/page.tsx`, `app/pos/caja/cierre/{page.tsx,conteo/page.tsx}`
- **Cambios de base de datos:** columna `configuracion_negocio.bloqueo_caja_activo`, tablas
  `bloqueo_caja_productos`/`bloqueo_caja_conteos`/`bloqueo_caja_conteo_items`, función
  `registrar_conteo_bloqueo_caja`, `cerrar_turno` reemplazada con el gate
- **Criterios de aceptación:** (verificado contra la base real)
  - [x] Con el bloqueo activo y productos elegidos, `cerrar_turno` rechaza el cierre si no hay
        conteo para ese turno
  - [x] `registrar_conteo_bloqueo_caja` rechaza un conteo que no incluya exactamente los
        productos configurados
  - [x] Registrar el conteo no modifica `stock_actual` de ningún producto
  - [x] Un segundo conteo para el mismo turno es rechazado
  - [x] El límite de 10 productos se hace cumplir a nivel de base (RLS), no solo en la UI —
        probado insertando un 11º producto con la lista ya en 10
  - [x] Tras registrar el conteo, `cerrar_turno` deja de rechazar el cierre por este motivo
        (verificado con un turno de prueba propio, cerrado y limpiado — no se tocó ningún turno
        real en curso)

---

## Nota de verificación (2026-08-06)

Ciclo completo probado contra la base real (sin pasar por la UI, directo por API con sesión
real): sin turno → abrir ($5000) → segunda apertura rechazada (`23505`) → cerrar (contado
$5100, diferencia $100) → nueva apertura permitida después de cerrar. Todo se limpió al
terminar.

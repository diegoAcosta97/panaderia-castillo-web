# EPIC 11 — Control periódico de stock

Conteo físico vs. sistema, con aprobación separada del ajuste (RF-9).

---

### E11-1 — Esquema `controles_stock`, `control_stock_detalles` ✅ Hecho (2026-08-08)
- **Descripción:** enum `estado_control_stock`, ambas tablas (ver `docs/data-model.md`).
  Funcionalidad enteramente admin (las 3 rutas viven bajo `/admin/control-stock/**`): `select` en
  ambas tablas gated por `is_administrador()` (no abierto a cualquier autenticado, mismo criterio
  que `movimientos_stock_select_admin`). `diferencia` es una columna `generated always as
  (stock_contado - stock_sistema) stored` — nunca se inserta/actualiza a mano. Insertar un control
  (arranca `en_progreso`) y cerrarlo (`en_progreso` → `pendiente_aprobacion`) o rechazarlo
  (`pendiente_aprobacion` → `rechazado`) van directo vía policies `insert`/`update` gated por
  `is_administrador()` — el `with check` del `update` bloquea explícitamente que un cliente ponga
  `estado = 'aprobado'` con un update directo; esa transición **solo** la hace la función de E11-3.
- **Depende de:** `03-productos.md#E3-2`, `03-productos.md#E3-3`
- **Archivos/módulos:** `supabase/migrations/20260808090000_create_control_stock.sql`
- **Cambios de base de datos:** `create type estado_control_stock`, 2 tablas nuevas
- **Criterios de aceptación:**
  - [x] Existen ambas tablas con sus FKs — aplicada contra la base real con `npm run db:migrate`
        (`20260808090000_create_control_stock.sql`)

---

### E11-2 — Iniciar y cargar un conteo ✅ Hecho (2026-08-08)
- **Descripción:** pantalla que lista todos los productos con `controla_stock = true`, toma
  `stock_sistema` como snapshot al iniciar, y permite ingresar `stock_contado` producto por
  producto; al finalizar, pasa a `estado = 'pendiente_aprobacion'` (RF-9.1, RF-9.2). El
  `stock_sistema` de cada fila se toma del `stock_actual` leído al renderizar la página (Server
  Component); el input de `stock_contado` viene prellenado con ese mismo valor para que el admin
  solo tenga que corregir lo que difiere. `finalizarConteo` (`features/control-stock/actions.ts`)
  hace las 3 escrituras en secuencia: crea el control (`en_progreso`), inserta todos los detalles,
  y lo cierra (`pendiente_aprobacion` + `fecha_cierre`) — no es una transacción de base de datos
  (no hay invariante multi-fila que proteger acá, a diferencia de la aprobación de E11-3), pero es
  una operación admin de baja frecuencia sin concurrencia esperada.
- **Depende de:** E11-1
- **Archivos/módulos:** `app/admin/control-stock/nuevo/page.tsx`,
  `features/control-stock/components/NuevoControlStockForm.tsx`,
  `features/control-stock/actions.ts`, `repositories/controlStockRepository.ts`,
  `repositories/productosRepository.ts` (`listProductosControlaStock`)
- **Cambios de base de datos:** —
- **Criterios de aceptación:**
  - [x] Las diferencias (`stock_contado - stock_sistema`) se calculan y muestran correctamente
        al cerrar el conteo — verificado en un navegador real (Chrome, admin de prueba logueado):
        3 productos de prueba con `stock_actual` 100/50/20, contados como 95/50/25 → diferencias
        mostradas en vivo en el formulario como -5/0/+5, y las mismas 3 diferencias persistidas
        correctamente en `control_stock_detalles` tras "Finalizar conteo" (columna generada,
        confirmado con una consulta directa a la base)

---

### E11-3 — Función de aprobación con ajuste de stock ✅ Hecho (2026-08-08)
- **Descripción:** función `SECURITY DEFINER` `aprobar_control_stock(control_stock_id,
  aprobador_id)`: por cada detalle con diferencia ≠ 0, actualiza `productos.stock_actual` y
  crea `movimientos_stock` tipo `ajuste_control_stock`, y marca el control como `aprobado`. El
  ajuste **nunca** es automático al cargar el conteo (RF-9.4). Solo administrador (chequeado con
  `is_administrador()`, mismo patrón que `anular_venta`); bloquea cada producto con diferencia
  (`for update`) antes de leer/actualizar su stock, mismo patrón que
  `confirmar_venta`/`generar_lote_etiquetas`. Valida que `p_aprobador_id` coincida con
  `auth.uid()` (defensa extra) y que el control esté en `pendiente_aprobacion` antes de tocar
  nada.
- **Depende de:** E11-2
- **Archivos/módulos:**
  `supabase/migrations/20260808090005_create_aprobar_control_stock_function.sql`
- **Cambios de base de datos:** función `aprobar_control_stock`
- **Criterios de aceptación:**
  - [x] Un conteo en `pendiente_aprobacion` no modifica ningún stock hasta que se aprueba
        explícitamente — verificado contra la base real: tras cerrar el conteo de prueba (3
        productos, 2 con diferencia), `movimientos_stock` seguía vacío para esos productos y
        `stock_actual` sin cambios hasta llamar la función
  - [x] Al aprobar, el stock de cada producto con diferencia queda igual al `stock_contado` —
        verificado contra la base real llamando la función desde el navegador (botón "Aprobar" de
        E11-4): los 2 productos con diferencia quedaron con `stock_actual` exactamente en su
        `stock_contado` (95 y 25), el tercero (sin diferencia) no se tocó, y se crearon
        exactamente 2 filas de `movimientos_stock` (`tipo = 'ajuste_control_stock'`, `cantidad` =
        diferencia con signo, `stock_resultante` = `stock_contado`, `referencia_id` = id del
        control)

---

### E11-4 — Pantalla de aprobación/rechazo (admin) ✅ Hecho (2026-08-08)
- **Descripción:** `/admin/control-stock/[id]` — revisión de diferencias, botón aprobar (llama
  a E11-3) o rechazar (queda registrado para análisis sin tocar stock: update de una sola fila
  gated por la policy `controles_stock_update_admin` de E11-1, sin función `SECURITY DEFINER` —
  set `estado = 'rechazado'`, `usuario_aprobador_id`/`fecha_aprobacion`). Ambos botones solo se
  muestran mientras el control está `pendiente_aprobacion`, con un diálogo de confirmación antes
  de ejecutar.
- **Depende de:** E11-3, `02-roles.md#E2-2`
- **Archivos/módulos:** `app/admin/control-stock/[id]/page.tsx`,
  `features/control-stock/components/AprobarRechazarControlStock.tsx`
- **Cambios de base de datos:** —
- **Criterios de aceptación:**
  - [x] Solo el administrador puede aprobar/rechazar un conteo — verificado de dos formas: (1) en
        el navegador, con la cuenta de prueba `cajero1@prueba.com` (rol `cajero`), navegar
        directamente a `/admin/control-stock` redirige a `/pos/caja` (guard de
        `app/admin/layout.tsx`, ni siquiera llega a ver el botón); (2) `aprobar_control_stock` y
        la policy de update de `controles_stock` chequean `is_administrador()` server-side, no
        solo el guard de ruta. Probado también el flujo de rechazo completo con el admin de
        prueba: el control quedó `rechazado` con `usuario_aprobador_id`/`fecha_aprobacion`
        seteados y el stock del producto con diferencia (-2) permaneció sin cambios.

---

### E11-5 — Historial de controles de stock ✅ Hecho (2026-08-08)
- **Descripción:** listado en `/admin/control-stock` de conteos pasados con sus diferencias,
  para analizar faltantes recurrentes por producto (RF-9.3). Dos secciones: la lista de controles
  (fecha/estado/link a detalle) y un desglose "Diferencias por producto" con todas las filas de
  `control_stock_detalles` con diferencia ≠ 0 de todos los controles, cada una con la fecha y
  estado de su control y un link directo — así se ve de un vistazo si un producto viene
  arrastrando faltantes en más de un conteo, sin tener que abrir control por control.
- **Depende de:** E11-4
- **Archivos/módulos:** `app/admin/control-stock/page.tsx`,
  `repositories/controlStockRepository.ts` (`listControlesStock`, `listDetallesConDiferencia`)
- **Cambios de base de datos:** —
- **Criterios de aceptación:**
  - [x] El listado permite ver, para un producto dado, su historial de diferencias a lo largo
        de varios controles — verificado en el navegador con 2 controles de prueba (uno aprobado
        con 2 productos con diferencia, uno rechazado con 1 producto con diferencia): la sección
        "Diferencias por producto" mostró las 3 filas correctas, cada una con su fecha, signo de
        diferencia y estado del control (`Aprobado`/`Rechazado`), con link a cada control

---

## Verificación general (2026-08-08)

Todo lo de arriba se verificó contra la base de datos remota real (Supabase, vía
`npm run db:migrate` para las migraciones y scripts `.mjs` con la service-role key para
inspección/limpieza) y en un navegador real (Chrome, vía las herramientas de automatización) con
un administrador de prueba creado con `scripts/db/createAdmin.ts` y un producto/categoría de
prueba, ambos eliminados al terminar. El administrador de prueba fue borrado con
`supabase.auth.admin.deleteUser` — `perfiles.id` tiene `on delete cascade` desde `auth.users`
(`supabase/migrations/20260806092724_create_perfiles_y_roles.sql`), así que no hizo falta borrar
la fila de `perfiles` a mano. `npm run lint` y `npx tsc --noEmit` quedaron limpios (aparte del
error preexistente y no relacionado de `features/auth/hooks/useIdleTimeout.ts:18`, fuera del
alcance de esta epic).

**Gaps honestos:**
- `finalizarConteo` (E11-2) no es una transacción atómica de base de datos — son 3 llamadas
  RLS-gated en secuencia (crear control → insertar detalles → cerrar). Si el proceso se
  interrumpe entre medio (ej. se cierra la pestaña), puede quedar un control en `en_progreso`
  huérfano sin detalles. No se automatizó una limpieza de esos controles huérfanos — un admin
  puede simplemente empezar un conteo nuevo, el viejo queda visible en el historial como
  `en_progreso` sin más consecuencia (nunca se le puede ajustar stock, la función de aprobación
  exige `estado = 'pendiente_aprobacion'`).
- No se probó el caso de dos administradores corriendo un conteo o una aprobación al mismo tiempo
  sobre el mismo producto (el `for update` en `aprobar_control_stock` está para eso, mismo patrón
  que `confirmar_venta`, pero no se generó una condición de carrera real para confirmarlo en esta
  pasada).
- No se probó con productos de `tipo_venta = 'peso'` (decimales en `stock_contado`) ni con un
  catálogo grande (se probó con 3 productos de prueba) — el input acepta `step="0.001"` y el
  cálculo de diferencia es aritmética simple, no debería haber sorpresas, pero no se ejercitó
  explícitamente.

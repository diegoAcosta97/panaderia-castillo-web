# EPIC 14 — Merma y consumo interno

Registro de salidas de stock que no son una venta: producto roto/vencido (merma) y producto
consumido por personal o dueño (consumo interno). Cierra la brecha más directa detectada en el
análisis de arquitectura de control de stock (2026-08-11) contra lo ya implementado en EPIC 11:
hoy, toda merma o consumo no registrado termina disfrazado de "faltante no explicado" en el
próximo control de stock. Con estos dos tipos de movimiento, `ajuste_control_stock` pasa a
significar lo que debería — lo que de verdad no tiene explicación.

---

### E14-1 — Esquema: tipos de movimiento y columnas de motivo/empleado
- **Descripción:** agrega `'merma'` y `'consumo_interno'` a `tipo_movimiento_stock` (`alter type
  ... add value`, en su propia migración/transacción — no se puede usar un valor de enum recién
  agregado en la misma transacción que lo crea). Agrega a `movimientos_stock` las columnas
  `motivo` (`text`, nullable a nivel de columna — la obligatoriedad para merma/consumo_interno se
  valida en las funciones de E14-2/E14-3, no con un `check` de tabla, porque `venta`/
  `anulacion_venta`/etc. no la usan) y `empleado_id` (`uuid`, nullable, FK a `empleados.id`, solo
  se completa para `consumo_interno`). Sin cambios de RLS: `movimientos_stock` ya no tiene
  policies de insert/update para `authenticated` (E13-1), las columnas nuevas heredan esa
  protección sin tocar nada.
- **Depende de:** `03-productos.md#E3-3`, `10-etiquetas.md` (empleados existe desde
  `docs/backlog` de pagos a empleados, migración `20260810100000_create_empleados.sql`)
- **Archivos/módulos:** `supabase/migrations/20260811090000_add_merma_consumo_interno.sql`,
  `types/database.ts` (agregar los dos valores a `TipoMovimientoStock` y las dos columnas al
  `Row`/`Insert`/`Update` de `movimientos_stock`)
- **Cambios de base de datos:** `alter type tipo_movimiento_stock add value`, `alter table
  movimientos_stock add column motivo`, `add column empleado_id`
- **Criterios de aceptación:**
  - [ ] `npm run db:migrate` aplica la migración sin errores contra la base real
  - [ ] Los valores `'merma'` y `'consumo_interno'` existen en el enum (verificable con `select
        enum_range(null::tipo_movimiento_stock)`)

---

### E14-2 — Función `registrar_merma`
- **Descripción:** función `SECURITY DEFINER` que descuenta stock por rotura/vencimiento/
  deterioro, con `motivo` obligatorio (texto libre, ej. "Caída de la góndola", "Vencido").
  Mismo esqueleto que `confirmar_venta`/`generar_lote_etiquetas`: bloquea el producto (`select
  ... for update`) antes de leer `stock_actual`, valida `p_cantidad > 0`, `motivo` no vacío, que
  el producto exista y **controle stock** (si no controla stock, no tiene sentido registrar una
  merma que no se puede medir — se rechaza con excepción clara), y que haya stock suficiente
  (mismo check que una venta: no se puede dar de baja más de lo que el sistema dice que hay).
  Descuenta `stock_actual`, inserta `movimientos_stock` (`tipo = 'merma'`, `cantidad` negativa,
  `motivo` = el texto recibido, sin `referencia_id` — no hay una entidad padre). **Sin gate de
  `is_administrador()`**: la puede llamar cualquier usuario autenticado (cajero o administrador),
  mismo criterio que `crearGasto` (E5-2) — es una operación que ocurre en el momento, en el piso
  de venta, y exigir aprobación previa desalentaría registrarla al toque.
- **Depende de:** E14-1
- **Archivos/módulos:** `supabase/migrations/20260811090005_create_registrar_merma_function.sql`,
  `types/database.ts` (`Functions.registrar_merma`)
- **Cambios de base de datos:** función `registrar_merma(p_producto_id uuid, p_cantidad numeric,
  p_motivo text) returns jsonb`
- **Criterios de aceptación:**
  - [ ] Registrar una merma descuenta `stock_actual` y crea un `movimientos_stock` con `tipo =
        'merma'`, `cantidad` negativa y `motivo` cargado
  - [ ] Rechaza `motivo` vacío, `cantidad <= 0`, producto que no controla stock, y stock
        insuficiente
  - [ ] Un cajero de prueba (no administrador) puede llamarla exitosamente

---

### E14-3 — Función `registrar_consumo_interno`
- **Descripción:** misma forma que E14-2, para consumo de personal/dueño. `p_empleado_id`
  **opcional** (nullable) — permite registrar "consumo del dueño / sin asignar a un empleado
  puntual" sin forzar un valor artificial; cuando se pasa, la función valida que el empleado
  exista y esté `activo` (si no, excepción — evita atribuir consumo a alguien que ya no trabaja
  ahí). `motivo` obligatorio igual que en E14-2 (distingue al menos "consumo de personal" de
  "consumo del dueño" aunque no haya `empleado_id`). Inserta `movimientos_stock` con `tipo =
  'consumo_interno'`, `cantidad` negativa, `empleado_id` y `motivo`. Mismos checks de
  `controla_stock`/stock suficiente/`for update` que E14-2. Sin gate de `is_administrador()`,
  mismo criterio que E14-2.
- **Depende de:** E14-1
- **Archivos/módulos:**
  `supabase/migrations/20260811090010_create_registrar_consumo_interno_function.sql`,
  `types/database.ts` (`Functions.registrar_consumo_interno`)
- **Cambios de base de datos:** función `registrar_consumo_interno(p_producto_id uuid, p_cantidad
  numeric, p_empleado_id uuid, p_motivo text) returns jsonb`
- **Criterios de aceptación:**
  - [ ] Registrar un consumo interno con empleado descuenta stock y crea el movimiento con
        `empleado_id` y `motivo` correctos
  - [ ] Registrar sin `empleado_id` (null) funciona igual, con `motivo` como único rastro de a
        quién corresponde
  - [ ] Rechaza un `empleado_id` de un empleado inactivo o inexistente

---

### E14-4 — Pantalla "Registrar merma" (cajero y administrador)
- **Descripción:** `/pos/merma`, dentro del route group `app/pos/(operacion)/` (hereda el guard
  de turno abierto de E4-2, mismo criterio que `/pos/gastos` y `/pos/etiquetas` — no hay
  `caja_turno_id` en el movimiento, pero registrar una merma fuera de un turno activo no
  corresponde al flujo operativo real). Reusa `ScannerInput` (búsqueda por código de barras o
  nombre, `features/ventas/components/ScannerInput.tsx`) para elegir el producto, muestra su
  stock actual, pide cantidad y motivo (input de texto libre; considerar una lista de motivos
  frecuentes — "Rotura", "Vencimiento", "Derrame" — con opción "Otro" a texto libre, decidido en
  la implementación de la pantalla). Llama a `registrar_merma` vía Server Action delgada, mismo
  patrón que `crearGasto`.
- **Depende de:** E14-2
- **Archivos/módulos:** `app/pos/(operacion)/merma/page.tsx`,
  `features/merma/{actions.ts,components/PantallaMerma.tsx,hooks/useRegistrarMerma.ts}`,
  `repositories/movimientosStockRepository.ts` (`registrarMerma`),
  `features/layout/components/PosTopBar.tsx` (nuevo link)
- **Cambios de base de datos:** —
- **Criterios de aceptación:**
  - [ ] Un cajero puede registrar una merma de un producto real durante su turno y el stock baja
        en pantalla tras confirmar
  - [ ] No se puede confirmar sin motivo ni con cantidad mayor al stock disponible (mensaje claro
        del error que devuelve la función)

---

### E14-5 — Pantalla "Registrar consumo interno" (cajero y administrador)
- **Descripción:** `/pos/consumo-interno`, mismo route group y mismo patrón que E14-4. Además
  del producto y la cantidad, un selector de empleado (`listEmpleados` filtrado a `activo =
  true`, más una opción explícita "Dueño / sin asignar" que manda `empleado_id = null`) y motivo.
- **Depende de:** E14-3, `repositories/empleadosRepository.ts` (ya existe, `listEmpleados`)
- **Archivos/módulos:** `app/pos/(operacion)/consumo-interno/page.tsx`,
  `features/consumo-interno/{actions.ts,components/PantallaConsumoInterno.tsx,hooks/useRegistrarConsumoInterno.ts}`,
  `repositories/movimientosStockRepository.ts` (`registrarConsumoInterno`),
  `features/layout/components/PosTopBar.tsx` (nuevo link)
- **Cambios de base de datos:** —
- **Criterios de aceptación:**
  - [ ] Registrar un consumo interno asignado a un empleado activo funciona de punta a punta
  - [ ] Solo aparecen empleados activos en el selector
  - [ ] La opción "Dueño / sin asignar" registra el movimiento con `empleado_id = null`

---

### E14-6 — Historial de movimientos de stock (administrador)
- **Descripción:** `/admin/movimientos-stock` — listado de `movimientos_stock` (todos los
  tipos, no solo merma/consumo interno) con filtro por tipo, producto y rango de fecha, mostrando
  `motivo`/`empleado_id` cuando corresponde. Es la primera pantalla que expone `movimientos_stock`
  directamente (hoy solo se ve indirectamente a través del detalle de una venta o de un control de
  stock) — sienta la base para el reporte de pérdida económica que depende de `costo_unitario`
  (epic futura, no en este alcance). Reusa el patrón `DataTable` server-side ya establecido en
  `/admin/productos`/`/admin/empleados`.
- **Depende de:** E14-2, E14-3, `02-roles.md#E2-2`
- **Archivos/módulos:** `app/admin/movimientos-stock/page.tsx`,
  `repositories/movimientosStockRepository.ts` (`listMovimientosStockPaginated`),
  `features/movimientos-stock/{components/MovimientosStockTable.tsx,hooks/useMovimientosStockTable.ts}`
- **Cambios de base de datos:** —
- **Criterios de aceptación:**
  - [ ] El listado muestra mermas y consumos internos registrados en E14-4/E14-5, con motivo y
        empleado (si aplica)
  - [ ] Filtrar por tipo/producto/rango de fecha devuelve los resultados correctos
  - [ ] Un cajero no puede acceder a esta pantalla (RLS: `movimientos_stock_select_admin` ya
        restringe el `select` a `is_administrador()`, mismo guard de `/admin/**` que el resto)

---

## Decisiones de esta epic

- **Sin aprobación previa para merma/consumo interno**, a diferencia de `ajuste_control_stock`:
  son hechos que el que los registra presencia directamente (rompió esto, se llevó aquello), no
  una diferencia a investigar. Exigir aprobación las volvería una fricción que en la práctica
  empuja a no registrarlas — que es exactamente el problema que esta epic busca resolver. El
  costo de este criterio (un cajero podría registrar una merma falsa para tapar algo) se mitiga
  con visibilidad: E14-6 deja todo agrupado por `usuario_id`, así un patrón de "este usuario
  registra mucha merma" queda expuesto para revisión, no oculto — mismo espíritu que el brief
  original (sección 7: detectar, no acusar automáticamente).
- **`motivo` obligatorio, `empleado_id` opcional**: el motivo es lo mínimo indispensable para que
  el movimiento sea auditable; el empleado es un dato adicional que no siempre se puede precisar
  (consumo del dueño, o nadie anotó quién fue en el momento).
- **No se crean tablas `mermas`/`consumos_internos` separadas** — son `movimientos_stock`
  filtrado por `tipo`, mismo criterio que ya aplica `ajuste_control_stock` (sin tabla propia
  desde EPIC 11).

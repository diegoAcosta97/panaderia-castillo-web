# EPIC 15 — Ingreso de mercadería

Registro de entrada de stock por compra a proveedor (no había ninguna vía diagramada: hoy un
ingreso real termina disfrazado de `ajuste_control_stock` o `ajuste_manual` en el próximo
control de stock, igual que la brecha que motivó EPIC 14 para las salidas). Mismo criterio de
aprobación que `controles_stock` (EPIC 11): quien carga no es necesariamente quien decide si
impacta stock — con una diferencia clave, pedida por el dueño: si carga un administrador, el
ingreso se aprueba solo en el mismo paso.

---

### E15-1 — Esquema: tipo de movimiento
- **Descripción:** agrega `'ingreso_mercaderia'` a `tipo_movimiento_stock` (`alter type ... add
  value`, en su propia migración/transacción, mismo criterio que E14-1).
- **Depende de:** `03-productos.md#E3-3`
- **Archivos/módulos:** `supabase/migrations/20260816090000_add_ingreso_mercaderia_tipo_movimiento.sql`,
  `types/database.ts` (`TipoMovimientoStock`), `features/movimientos-stock/lib/tipoMovimientoLabels.ts`
- **Cambios de base de datos:** `alter type tipo_movimiento_stock add value`
- **Criterios de aceptación:**
  - [x] `npm run db:migrate` aplica la migración sin errores contra la base real
  - [x] El valor `'ingreso_mercaderia'` existe en el enum

---

### E15-2 — Esquema: `ingresos_mercaderia` / `ingreso_mercaderia_items`
- **Descripción:** tabla `ingresos_mercaderia` (`estado` = `pendiente_aprobacion` | `aprobado` |
  `rechazado`, `usuario_id` de quien carga, `usuario_aprobador_id`/`fecha_aprobacion` nullable) y
  `ingreso_mercaderia_items` (`producto_id`, `cantidad` > 0, `stock_previo` snapshot al cargar,
  `stock_resultante` nullable hasta que se aprueba). A diferencia de `controles_stock`, **sin
  ninguna policy de insert/update para `authenticated`**: las tres transiciones (crear/aprobar/
  rechazar) van exclusivamente por funciones `SECURITY DEFINER` (E15-3/E15-4) — mismo
  endurecimiento que E13-1 le aplicó a `movimientos_stock`, acá desde el vamos. Solo hay policy de
  `select`, admin-only (para el listado/detalle de `/admin/ingresos-mercaderia`).
- **Depende de:** E15-1
- **Archivos/módulos:** `supabase/migrations/20260816090005_create_ingresos_mercaderia.sql`,
  `types/database.ts` (tablas + `EstadoIngresoMercaderia`)
- **Cambios de base de datos:** `create type estado_ingreso_mercaderia`, `create table
  ingresos_mercaderia`, `create table ingreso_mercaderia_items`, políticas de `select` admin-only
- **Criterios de aceptación:**
  - [x] Un `insert` directo a `ingresos_mercaderia` desde un cliente autenticado (bypaseando las
        funciones) afecta 0 filas — no hay policy que lo permita

---

### E15-3 — Función `crear_ingreso_mercaderia`
- **Descripción:** función `SECURITY DEFINER` que da de alta el ingreso + sus items en una sola
  transacción (`p_items` como `jsonb`, mismo patrón que `crear_pedido_encargo`). Sin gate de
  `is_administrador()` para poder llamarla — cualquier autenticado puede cargar un ingreso, la
  rama de comportamiento se decide adentro: si quien llama es administrador
  (`is_administrador()`), el ingreso nace `aprobado` y la misma función ya bloquea cada producto
  (`for update`), suma `cantidad` a `stock_actual` y deja el `movimientos_stock` de auditoría; si
  es cajero, nace `pendiente_aprobacion` y no toca stock (los items solo guardan el snapshot
  `stock_previo`, `stock_resultante` queda `null` hasta E15-4). Valida `cantidad > 0` por item y
  que el producto tenga `controla_stock = true`.
- **Depende de:** E15-2
- **Archivos/módulos:** `supabase/migrations/20260816090010_create_crear_ingreso_mercaderia_function.sql`,
  `repositories/ingresoMercaderiaRepository.ts` (`crearIngresoMercaderia`),
  `features/ingreso-mercaderia/hooks/useRegistrarIngresoMercaderia.ts`,
  `features/ingreso-mercaderia/components/FormularioIngresoMercaderia.tsx`,
  `app/pos/(operacion)/ingresos-mercaderia/page.tsx`, `app/admin/ingresos-mercaderia/nuevo/page.tsx`
- **Cambios de base de datos:** función `crear_ingreso_mercaderia(p_items jsonb, p_observaciones
  text) returns jsonb`
- **Criterios de aceptación:**
  - [x] Cargado por un cajero: el ingreso queda `pendiente_aprobacion` y `stock_actual` no cambia
        (verificado contra la base real simulando `auth.uid()` de un cajero y un admin reales)
  - [x] Cargado por un administrador: el ingreso queda `aprobado`, `stock_actual` sube en la
        cantidad cargada y queda un `movimientos_stock` con `tipo = 'ingreso_mercaderia'`

---

### E15-4 — Funciones `aprobar_ingreso_mercaderia` / `rechazar_ingreso_mercaderia`
- **Descripción:** `aprobar_ingreso_mercaderia` (solo administrador, mismo esqueleto que
  `aprobar_control_stock`): por cada item bloquea el producto y suma `cantidad` al `stock_actual`
  **vigente** en ese momento (no al `stock_previo` capturado al cargar) para no perder
  ventas/mermas ocurridas mientras el ingreso estuvo pendiente; deja el `movimientos_stock` de
  auditoría y completa `stock_resultante` en cada item. `rechazar_ingreso_mercaderia` (también
  función, no update directo, porque E15-2 no dejó ninguna policy de update) solo cambia el
  estado, no toca stock. Pantalla de aprobar/rechazar en `/admin/ingresos-mercaderia/[id]`, misma
  UX que `/admin/control-stock/[id]` (E11-4).
- **Depende de:** E15-3
- **Archivos/módulos:**
  `supabase/migrations/20260816090015_create_aprobar_ingreso_mercaderia_function.sql`,
  `supabase/migrations/20260816090020_create_rechazar_ingreso_mercaderia_function.sql`,
  `repositories/ingresoMercaderiaRepository.ts` (`aprobarIngresoMercaderia`,
  `rechazarIngresoMercaderia`, `listIngresosMercaderiaPaginated`, `getIngresoMercaderia`,
  `getItemsIngresoMercaderia`), `features/ingreso-mercaderia/actions.ts`,
  `features/ingreso-mercaderia/components/{AprobarRechazarIngresoMercaderia,IngresosMercaderiaTable}.tsx`,
  `features/ingreso-mercaderia/hooks/useIngresosMercaderiaTable.ts`,
  `app/admin/ingresos-mercaderia/{page.tsx,[id]/page.tsx}`
- **Cambios de base de datos:** funciones `aprobar_ingreso_mercaderia(p_ingreso_mercaderia_id
  uuid, p_aprobador_id uuid)`, `rechazar_ingreso_mercaderia(p_ingreso_mercaderia_id uuid,
  p_aprobador_id uuid)`, ambas `returns void`
- **Criterios de aceptación:**
  - [x] Aprobar un ingreso pendiente suma la cantidad al `stock_actual` vigente (no al snapshot)
        y deja el `movimientos_stock` correspondiente — verificado contra la base real
  - [x] Rechazar un ingreso pendiente no modifica `stock_actual` — verificado contra la base real
  - [x] Un cajero no puede llamar `aprobar_ingreso_mercaderia`/`rechazar_ingreso_mercaderia` (la
        función revienta con "No autorizado.") — reforzado también por el guard de `/admin` y
        `requireAdmin()` en las Server Actions, mismo criterio de 3 capas que E2-4/E11-3

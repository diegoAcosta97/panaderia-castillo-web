# EPIC 16 — Producción propia

Pedido de producción interna (sanguchería y panadería): un administrador carga qué se va a
producir, para quién/quién lo hace y para cuándo; cuando termina, ratifica cuánto se produjo
realmente (para ver faltantes o excedentes contra lo planificado) y eso incrementa el stock. A
diferencia de EPIC 15 (ingreso de mercadería, que también puede cargar un cajero y queda pendiente
de aprobación), acá todo el flujo — cargar y confirmar — es exclusivamente admin, pedido
explícito del dueño.

---

### E16-1 — Esquema: categorías habilitadas para producción
- **Descripción:** columna `habilitada_produccion` en `categorias` (default `false`), editable
  desde `/admin/productos/categorias` con un checkbox nuevo (mismo criterio que `activo` al
  lado). Determina qué productos se pueden listar al armar una producción (RF del dueño: "solo
  sanguchería y panadería van a poder listarse") — decisión de diseño: casilla editable en vez de
  filtrar por nombre de categoría, para no depender de que el nombre contenga una palabra
  específica y no romperse si se renombra o se agrega una categoría nueva.
  `listProductosParaProduccion` (repositorio) filtra productos con `controla_stock = true` **y**
  categoría habilitada — decisión también confirmada con el dueño: no tiene sentido producir algo
  que no lleva stock.
- **Depende de:** `03-productos.md#E3-1`
- **Archivos/módulos:** `supabase/migrations/20260821090030_add_habilitada_produccion_categorias.sql`,
  `types/database.ts` (`categorias`), `repositories/categoriasRepository.ts`,
  `repositories/productosRepository.ts` (`listProductosParaProduccion`),
  `features/productos/components/CategoriasTable.tsx`, `features/productos/actions.ts`
- **Cambios de base de datos:** `alter table categorias add column habilitada_produccion boolean`
- **Criterios de aceptación:**
  - [x] Un producto de una categoría con `habilitada_produccion = false`, o que no controla
        stock, no aparece en `listProductosParaProduccion` — verificado contra la base real

---

### E16-2 — Esquema: `producciones` / `produccion_items` + tipo de movimiento
- **Descripción:** enum `estado_produccion` (`pendiente` | `completado` | `cancelado`), tabla
  `producciones` (`empleado_id` quien la hace, `usuario_id` admin que la carga, `fecha_pedido`,
  `fecha_entrega`, `usuario_completo_id`/`fecha_completado` nullable) y `produccion_items`
  (`cantidad_pedida` planificada al cargar, `cantidad_producida` nullable hasta completar,
  `diferencia` columna generada `cantidad_producida - cantidad_pedida`, mismo patrón que
  `control_stock_detalles`). Sin ninguna policy de insert/update para `authenticated` — las tres
  transiciones (crear/completar/cancelar) van exclusivamente por funciones `SECURITY DEFINER`
  (E16-3/E16-4/E16-5), mismo endurecimiento que `ingresos_mercaderia` (E15-2). Solo hay policy de
  `select`, admin-only. Nuevo valor `'produccion_propia'` en `tipo_movimiento_stock` (`alter type
  ... add value`, migración propia — un valor de enum recién agregado no se puede usar en la
  misma transacción que lo crea, mismo criterio que E14-1/E15-1) para distinguir un incremento de
  stock por producción interna de uno por compra a proveedor (`ingreso_mercaderia`).
- **Depende de:** E16-1, `03-productos.md#E3-3`
- **Archivos/módulos:** `supabase/migrations/20260821090035_create_produccion.sql`,
  `supabase/migrations/20260821090040_add_produccion_propia_tipo_movimiento.sql`,
  `types/database.ts` (`EstadoProduccion`, tablas), `features/movimientos-stock/lib/tipoMovimientoLabels.ts`
- **Cambios de base de datos:** `create type estado_produccion`, `create table producciones`,
  `create table produccion_items`, `alter type tipo_movimiento_stock add value 'produccion_propia'`
- **Criterios de aceptación:**
  - [x] Un `insert` directo a `producciones` desde un cliente autenticado (bypaseando las
        funciones) afecta 0 filas — no hay policy que lo permita

---

### E16-3 — Función `crear_produccion`
- **Descripción:** función `SECURITY DEFINER`, solo administrador (`is_administrador()`, a
  diferencia de `crear_ingreso_mercaderia` que cualquier autenticado puede llamar — acá todo el
  flujo es admin desde el vamos). Da de alta la producción + sus items planificados en una sola
  transacción (`p_items` como `jsonb`). Valida que el empleado exista y esté activo, que
  `fecha_entrega >= fecha_pedido`, y por cada item que el producto controle stock y pertenezca a
  una categoría habilitada para producción — defensa server-side, no solo el filtro del selector
  en la UI (un cliente podría mandar cualquier `producto_id` directo al RPC).
- **Depende de:** E16-2
- **Archivos/módulos:** `supabase/migrations/20260821090045_create_crear_produccion_function.sql`,
  `repositories/produccionRepository.ts` (`crearProduccion`), `features/produccion/actions.ts`,
  `features/produccion/components/NuevaProduccionForm.tsx`, `app/admin/produccion/page.tsx`
- **Cambios de base de datos:** función `crear_produccion(p_empleado_id uuid, p_fecha_pedido
  date, p_fecha_entrega date, p_items jsonb, p_observaciones text) returns jsonb`
- **Criterios de aceptación:** (verificados contra la base real, transacción revertida)
  - [x] Un producto de una categoría no habilitada para producción es rechazado
  - [x] Una producción válida queda `pendiente`, con sus items en `cantidad_pedida` y
        `cantidad_producida` en `null`

---

### E16-4 — Función `completar_produccion`
- **Descripción:** función `SECURITY DEFINER`, solo administrador. Ratifica la cantidad
  realmente producida de cada item planificado (RF del dueño: "para ver si hubo faltantes o si se
  hizo algo de más") y admite productos nuevos no planificados (`cantidad_pedida = 0` en ese
  caso, insertados ahí mismo). Exige que `p_items` cubra **todos** los productos ya planificados
  (si falta alguno, rechaza con "Faltan confirmar cantidades de algún producto planificado") y
  rechaza productos repetidos en `p_items`, para no sumar el mismo ajuste de stock dos veces por
  error. Cada producto con `cantidad_producida > 0` suma `stock_actual` (bloqueando el producto
  con `for update`, mismo esqueleto que `aprobar_ingreso_mercaderia`) y deja un
  `movimientos_stock` con `tipo = 'produccion_propia'` — `0` es un valor válido (faltante total de
  ese item) que simplemente no genera movimiento. Si el mismo producto quedó en dos grupos
  distintos dentro de una misma producción (no debería pasar desde la UI), cada `update` de stock
  ve el `stock_actual` ya actualizado por la iteración anterior dentro de la misma transacción.
  `CompletarProduccionForm` (UI) pre-carga cada fila con `cantidad_pedida` como valor sugerido (lo
  más común es que coincida) y deja agregar un producto no planificado desde la misma lista
  restringida de E16-1.
- **Depende de:** E16-3
- **Archivos/módulos:** `supabase/migrations/20260821090050_create_completar_produccion_function.sql`,
  `repositories/produccionRepository.ts` (`completarProduccion`, `getProduccion`,
  `getProduccionItems`), `features/produccion/actions.ts`,
  `features/produccion/components/CompletarProduccionForm.tsx`, `app/admin/produccion/[id]/page.tsx`
- **Cambios de base de datos:** función `completar_produccion(p_produccion_id uuid, p_items
  jsonb) returns jsonb`
- **Criterios de aceptación:** (verificados contra la base real, transacción revertida)
  - [x] Completar con un faltante (48 de 50 pedidas) y una sobra (35 de 30 pedidas) deja
        `diferencia = -2` y `diferencia = 5` respectivamente, y `stock_actual` sube exactamente lo
        producido (no lo pedido) en cada caso
  - [x] Agregar un producto no planificado (12 unidades) lo inserta con `cantidad_pedida = 0`,
        `diferencia = 12`, y suma stock igual que los planificados
  - [x] Completar sin cubrir todos los productos planificados se rechaza
  - [x] Completar una producción ya completada, o cancelar una ya completada, se rechaza
  - [x] Cada item con `cantidad_producida > 0` deja exactamente un `movimientos_stock` con
        `tipo = 'produccion_propia'` y `referencia_id` apuntando a la producción

---

### E16-5 — Función `cancelar_produccion` + listado
- **Descripción:** `cancelar_produccion` (`SECURITY DEFINER`, solo administrador) cambia el
  estado a `cancelado` solo si sigue `pendiente` — no toca stock (nada se movió todavía). Decisión
  confirmada con el dueño: una producción pendiente **no se edita**, solo se cancela y se vuelve a
  cargar si hace falta corregir algo. `/admin/produccion` lista todas las producciones (filtro por
  estado, default `pendiente`) + el formulario de alta en la misma pantalla (mismo criterio que
  `/admin/pedidos`); `/admin/produccion/[id]` muestra el formulario de completar si sigue
  `pendiente`, o el detalle de items/diferencias de solo lectura si ya se resolvió. Entrada nueva
  "Producción" en el menú de admin, sección Stock.
- **Depende de:** E16-3
- **Archivos/módulos:** `supabase/migrations/20260821090055_create_cancelar_produccion_function.sql`,
  `repositories/produccionRepository.ts` (`cancelarProduccion`, `listProduccionesPaginated`),
  `features/produccion/{actions.ts,hooks/useProduccionesTable.ts,components/{ProduccionesTable,CancelarProduccionDialog}.tsx}`,
  `features/layout/components/AdminSidebar.tsx`
- **Cambios de base de datos:** función `cancelar_produccion(p_produccion_id uuid) returns void`
- **Criterios de aceptación:** (verificados contra la base real, transacción revertida)
  - [x] Cancelar una producción pendiente la deja `cancelado` sin tocar ningún stock
  - [x] Cancelar una producción ya completada se rechaza

---

### E16-6 — Producción pendiente de la semana en el dashboard
- **Objetivo:** verla toda de un vistazo desde `/admin` y entrar directo a completarla, sin tener
  que ir a buscarla a `/admin/produccion` (pedido del dueño: "un acceso más rápido").
- **Descripción:** tarjeta nueva en `/admin` (mismo lugar/estilo que "Próximos pedidos a
  entregar", justo debajo), visible solo si hay algo que mostrar. Lista toda producción
  `pendiente` con `fecha_entrega` hasta el domingo de la semana en curso — incluye lo ya vencido
  dentro de la semana, no solo lo que falta (mismo criterio que "Próximos pedidos": se resalta en
  rojo en vez de ocultarse). Cada fila linkea directo a `/admin/produccion/[id]` para completarla
  o cancelarla ahí mismo. `listProduccionesPendientesHasta` (repositorio) resuelve la cantidad de
  productos de cada producción con una segunda query agrupada en JS (no hace falta una vista/
  función nueva a este volumen, mismo criterio que el resto del dashboard).
- **Depende de:** E16-2, E16-5
- **Archivos/módulos:** `repositories/produccionRepository.ts`
  (`listProduccionesPendientesHasta`), `app/admin/page.tsx`
- **Cambios de base de datos:** —
- **Criterios de aceptación:**
  - [x] Una producción con entrega hoy aparece en el listado; una con entrega dentro de 21 días
        no — verificado contra la base real (transacción revertida)

---

### E16-7 — Planilla mensual "Registro de control de elaboración" (BPM)
- **Objetivo:** generar la planilla mensual de control de elaboración que exige el Manual de
  Buenas Prácticas de Manufactura, sin tener que armarla a mano.
- **Descripción:** botón "Control de Elaboración" en `/admin/produccion` → `/admin/produccion/
  control-elaboracion`. Se elige un mes (`<input type="month">`, no hay selector de mes en el
  design system) y `listFilasControlElaboracion` (repositorio) trae **solo producciones
  `completado`** de ese mes (decisión confirmada con el dueño: es un registro de lo que se
  produjo realmente, no de lo planificado) — se agrupan por `fecha_entrega` (mismo campo que
  determina a qué mes pertenece cada una: en una panadería coincide con el día real de
  elaboración) y se aplanan a una fila por item con `cantidad_producida > 0` (un item confirmado
  en 0 no tiene nada que registrar). Columnas: Fecha, Producto, Kg/Unidades producidas, Destino
  (desplegable, único valor posible hoy: `MOSTRADOR`, ver `DESTINOS` en
  `ControlElaboracionScreen.tsx` para agregar opciones a futuro), Responsable (empleado de la
  producción), Controló (celda vacía a propósito — RF del dueño: se completa a mano recién con la
  planilla ya impresa, nunca es un campo editable). Debajo de la tabla: sección "LOTES DE MATERIAS
  PRIMAS UTILIZADAS" con la lista fija de insumos pedida por el dueño, cada uno con un input al
  lado para anotar el lote (opcional completarlo en pantalla, si no queda en blanco para escribir
  a mano); y una sección de Observaciones (`<textarea>` simple, no hay componente Textarea en el
  design system). Todo lo editable (destino, lotes, observaciones) es estado local del
  componente, nunca se persiste en la base — es un armado efímero solo para imprimir, igual que
  `ListadoImprimible` en otras pantallas. Encabezado del PDF: logo (`/logo-castillo-gemini.png`,
  el mismo que ya se usa en el login), título "Manual de Buenas Prácticas de Manufactura",
  subtítulo "REGISTRO DE CONTROL DE ELABORACIÓN" y el mes en curso. Mismo patrón de impresión que
  el resto del sistema (`window.print()` vía `lib/print.ts`, sin librería de PDF): el `<Select>`
  de Destino se oculta en impresión (`print:hidden`) a favor de un `<span>` con el valor ya
  resuelto (`hidden print:inline`) porque un `<select>` no siempre imprime bien en todos los
  navegadores; los `<Input>` de texto (lotes, observaciones) sí imprimen su valor
  correctamente sin necesidad de ese truco.
- **Depende de:** E16-4 (usa `cantidad_producida`)
- **Archivos/módulos:** `repositories/produccionRepository.ts`
  (`listFilasControlElaboracion`), `features/produccion/components/ControlElaboracionScreen.tsx`,
  `app/admin/produccion/{page.tsx,control-elaboracion/page.tsx}`
- **Cambios de base de datos:** —
- **Criterios de aceptación:** (verificados contra la base real, transacción revertida)
  - [x] Una producción `completado` con entrega dentro del mes elegido aparece en la planilla
  - [x] Una producción `pendiente` (aunque tenga entrega ese mes) no aparece
  - [x] Una producción `completado` con entrega en un mes distinto no aparece

---

### E16-8 — Listado: iconos ver/imprimir + pedido de producción imprimible
- **Objetivo:** acceso más directo desde el listado, y un comprobante imprimible para
  entregarle al empleado que tiene que hacer la producción (RF del dueño).
- **Descripción:** en `ProduccionesTable`, la columna de acciones pasa de un link de texto "Ver"
  a dos botones ícono: ojo (`Eye`, va a `/admin/produccion/[id]`, igual que antes) e impresora
  (`Printer`, va a `/admin/produccion/[id]/comprobante`, en una pestaña nueva). Esa página nueva
  (`ComprobanteProduccion.tsx` + `BotonImprimirProduccion.tsx`) es un "pedido de producción"
  imprimible con los datos de catálogo (no los ratificados): responsable, fecha de pedido, fecha
  de entrega, observaciones, y la tabla de productos con la **cantidad pedida** (lo planificado,
  para que el empleado sepa qué tiene que hacer) — mismo patrón exacto que
  `app/pos/comprobante/[ventaId]/page.tsx` (E9-1): fuera de cualquier flujo transaccional, la RLS
  de `producciones`/`produccion_items` (admin-only) ya resuelve el acceso, sin lógica nueva.
- **Depende de:** E16-2
- **Archivos/módulos:** `features/produccion/components/{ProduccionesTable,ComprobanteProduccion,BotonImprimirProduccion}.tsx`,
  `app/admin/produccion/[id]/comprobante/page.tsx`
- **Cambios de base de datos:** —
- **Criterios de aceptación:**
  - [x] `npx tsc --noEmit` y `eslint` limpios sobre los archivos nuevos/tocados

---

### E16-9 — Datos de cocción obligatorios al completar (BPM)
- **Objetivo:** el registro de control de elaboración exige, por producto, la temperatura del
  medio de cocción, la temperatura interna del alimento y el tiempo de cocción — RF del dueño,
  agregado después de E16-7.
- **Descripción:** tres columnas nuevas en `produccion_items` (`temperatura_medio_coccion`,
  `temperatura_interna_alimento`, `tiempo_coccion_minutos`, todas `numeric` nullable). Sin check
  constraint a nivel de tabla a propósito: ya había producción real cargada antes de este cambio
  con `cantidad_producida > 0` y sin estos datos (no existían todavía) — un check ahí la habría
  dejado en un estado inválido retroactivamente. La obligatoriedad se valida enteramente dentro de
  `completar_produccion` (única puerta de escritura, sin policy de insert/update para
  `authenticated`, igual que siempre): si `cantidad_producida > 0`, los tres datos son
  obligatorios; si es `0` (faltante total, no hubo cocción), quedan `null`. `CompletarProduccionForm`
  refleja la misma regla en la UI — los tres inputs se habilitan/exigen (`required`) solo cuando la
  cantidad producida tipeada es mayor a 0, y el botón de confirmar queda deshabilitado si falta
  alguno.

  RF del dueño sobre dónde se **ven** estos datos — solo en dos lugares, en ningún otro:
  1. El detalle de una producción ya resuelta, `/admin/produccion/[id]` ("cuando se vea en cada
     día").
  2. La planilla mensual imprimible de E16-7 (`ControlElaboracionScreen`), como tres columnas
     nuevas entre "Kg/Unidades producidas" y "Destino".

  No aparecen en `ProduccionesTable`, la tarjeta del dashboard (E16-6), ni el pedido de
  producción imprimible de E16-8 (ese se genera *antes* de cocinar, no hay nada que mostrar
  todavía).
- **Depende de:** E16-4, E16-7
- **Archivos/módulos:**
  `supabase/migrations/20260821090060_add_datos_coccion_produccion_items.sql`,
  `supabase/migrations/20260821090065_completar_produccion_datos_coccion.sql`,
  `types/database.ts` (`produccion_items`), `repositories/produccionRepository.ts`
  (`CompletarProduccionItemInput`, `completarProduccion`, `FilaControlElaboracion`,
  `listFilasControlElaboracion`), `features/produccion/components/CompletarProduccionForm.tsx`,
  `features/produccion/components/ControlElaboracionScreen.tsx`,
  `app/admin/produccion/[id]/page.tsx`
- **Cambios de base de datos:** `alter table produccion_items add column
  temperatura_medio_coccion numeric`, `add column temperatura_interna_alimento numeric`,
  `add column tiempo_coccion_minutos numeric`; `create or replace function completar_produccion`
  (mismo signature, agrega la validación y el guardado de los tres datos)
- **Criterios de aceptación:** (verificados contra la base real, transacción revertida)
  - [x] Completar con `cantidad_producida > 0` y sin alguno de los tres datos de cocción se
        rechaza
  - [x] Completar con los tres datos presentes guarda los valores correctamente
  - [x] Un item con `cantidad_producida = 0` no exige (ni guarda) ningún dato de cocción

---

### E16-10 — Ajustes de impresión: minutos enteros + planilla mensual sin scroll en A4
- **Descripción:** dos correcciones reportadas después de E16-9:
  1. El input de "Tiempo de cocción" tenía `min="0.01" step="0.1"` en
     `CompletarProduccionForm` — esa combinación define una grilla de valores válidos
     (0.01, 0.11, 0.21...) que **no incluye enteros**, así que el navegador rechazaba "12" como
     "valor no válido" (validación nativa del `<input type="number">`, no de la app). Se
     cambió a `min="1" step="1"` para que solo se puedan cargar minutos enteros.
  2. La planilla mensual (E16-7) usaba el componente `<Table>` de shadcn para la tabla de 9
     columnas — ese componente envuelve el `<table>` en un `<div>` con `overflow-x-auto`
     fijo (no expone esa clase como prop), que en pantalla se ve como scroll horizontal pero al
     imprimir **recorta** lo que queda fuera del ancho visible en vez de mostrarlo — RF del dueño:
     "no con el scroll porque es para presentarla". Se separó en dos tablas: la interactiva
     (con el `<Select>` de Destino editable) queda `print:hidden`, visible solo en pantalla; y una
     tabla `<table>` HTML simple nueva, visible solo al imprimir (`hidden print:table`, mismo
     criterio que `Comprobante.tsx`/`ListadoImprimible.tsx`: las tablas imprimibles de este
     proyecto son HTML plano, nunca el `<Table>` interactivo), con `table-fixed` + un ancho en % 
     por columna (suma 100%) para que las 9 columnas entren siempre en el ancho de A4 sin scroll,
     encabezados abreviados ("Kg/Un.", "Resp.", etc. — RF del dueño: "se pueden abreviar las
     palabras... pero deben estar todas las columnas") y texto más chico (`text-[9px]`). También
     se agregó `@page { size: A4; margin: 10mm; }` en `app/globals.css` (dentro de
     `@media print`) para que el tamaño de papel no dependa de la configuración regional del
     navegador/impresora.
- **Depende de:** E16-7, E16-9
- **Archivos/módulos:** `features/produccion/components/{CompletarProduccionForm,ControlElaboracionScreen}.tsx`,
  `app/globals.css`
- **Cambios de base de datos:** —
- **Criterios de aceptación:**
  - [x] `npx tsc --noEmit` y `eslint` limpios sobre los archivos tocados

---

## Nota de verificación (2026-08-21)

Todo lo de arriba (E16-1 a E16-9) se verificó contra la base real con datos sintéticos, dentro de
transacciones revertidas (sin dejar filas de prueba persistidas): categorías habilitadas/no
habilitadas, productos con y sin `controla_stock`, alta de producción, rechazo por categoría no
habilitada, completar con faltante/sobra/producto nuevo, rechazo por item faltante y por estado
inválido, cancelación, filtro por mes/estado de la planilla de control de elaboración, y la
obligatoriedad de los datos de cocción. Falta la verificación en navegador real (crear una
producción, completarla y cancelar una desde la UI, generar/imprimir la planilla mensual) —
pendiente para una próxima sesión con credenciales de prueba.

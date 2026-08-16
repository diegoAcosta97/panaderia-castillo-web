# Modelo de datos objetivo

Referencia única de esquema para el backlog de implementación. Describe el diseño a construir;
todavía no hay migraciones ejecutadas. Complementa `docs/requisitos-funcionales.md` (el "qué") y
`docs/requisitos-no-funcionales.md` (decisiones transversales).

Este documento se armó **sin el modelo de datos original** que se mencionó como adjunto (no
llegó a esta conversación) — es un diseño desde cero a partir de los requisitos funcionales
relevados. Si aparece el modelo original, se compara contra esto y se ajusta.

## Enums

- `rol_usuario`: `administrador` | `cajero`
- `tipo_venta_producto`: `unidad` | `peso`
- `tipo_movimiento_stock`: `venta` | `anulacion_venta` | `etiqueta_generada` |
  `ajuste_control_stock` | `ajuste_manual` | `alta_inicial` | `merma` | `consumo_interno`
  (los dos últimos, EPIC 14)
- `estado_caja_turno`: `abierta` | `cerrada`
- `estado_venta`: `pendiente_pago` | `completada` | `anulada`
- `medio_pago`: `efectivo` | `mercado_pago` | `sena_pedido` | `tarjeta_debito` | `tarjeta_credito`
- `estado_pago_medio`: `pendiente` | `acreditado` | `rechazado`
- `tipo_beneficio_oferta`: `precio_fijo` | `descuento_porcentaje` | `descuento_monto`
- `tipo_efecto_descuento`: `porcentaje` | `monto_fijo`
- `tipo_condicion_descuento`: `monto_minimo` | `producto_incluido` | `categoria_incluida`
- `estado_control_stock`: `en_progreso` | `pendiente_aprobacion` | `aprobado` | `rechazado`

## Configuración del negocio

### `configuracion_negocio`
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid PK | fila única (constraint a nivel app: siempre existe exactamente 1 registro) |
| nombre_comercial | text | impreso en el encabezado del comprobante y las etiquetas |
| direccion | text, nullable | |
| telefono | text, nullable | |
| cuit | text, nullable | no usado todavía, se deja preparado para la integración AFIP futura |
| updated_at | timestamptz | |
| bloqueo_caja_activo | boolean | default false -- EPIC 4#E4-5, ver sección "Bloqueo de caja" |

Sin esta tabla no hay dónde imprimir el nombre/dirección del comercio en el comprobante o las
etiquetas — faltaba en la primera versión de este documento. Las credenciales de Mercado Pago
**no** van acá: son variables de entorno (ver `requisitos-no-funcionales.md`).

## Usuarios

### `perfiles`
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid PK | FK a `auth.users.id` |
| email | text | denormalizado desde `auth.users.email` por el trigger de alta — no estaba en el diseño original, se agregó en `02-roles.md#E2-4` para listar usuarios sin llamar a la Admin API solo para mostrar un email |
| rol | rol_usuario | default `cajero` |
| nombre_completo | text | |
| activo | boolean | default true |
| created_at | timestamptz | default now() |

RLS: cada usuario ve/edita su propio perfil (`perfiles_select_own`/`perfiles_update_own`,
`00-fundamentos.md#E0-4`); un administrador ve/edita cualquier perfil
(`perfiles_select_admin`/`perfiles_update_admin`, vía la función `is_administrador()`
`SECURITY DEFINER` — evita la recursión de una policy de `perfiles` que consulta `perfiles`,
`02-roles.md#E2-4`).

## Productos

### `categorias`
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| nombre | text, único | ej. "Almacén", "Panadería", "Bebidas" |
| activo | boolean | default true |

### `productos`
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| categoria_id | uuid | FK a `categorias.id` |
| nombre | text | |
| codigo_barras | text, único | asignado automáticamente si el producto no trae uno de fábrica |
| tipo_venta | tipo_venta_producto | fijo por producto — RF-1.2 |
| precio | numeric(12,2) | precio por unidad, o precio por kg si `tipo_venta = 'peso'` |
| controla_stock | boolean | default `true`; falso para productos de panadería — RF-1.3 |
| stock_actual | numeric(12,3), nullable | unidades enteras o kg según `tipo_venta`; null si `controla_stock = false` |
| stock_minimo | numeric(12,3), nullable | umbral de alerta de reposición — RF-1.4; solo si `controla_stock` |
| dias_vencimiento_default | int, nullable | vida útil sugerida en días, para prellenar la fecha de vencimiento al generar etiquetas |
| activo | boolean | default true |
| created_at / updated_at | timestamptz | |

Constraint: si `tipo_venta = 'unidad'`, `stock_actual` es entero (check a nivel DB).

## Proveedores y gastos

### `proveedores`
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| nombre | text | |
| cuit | text, nullable | |
| telefono | text, nullable | |
| email | text, nullable | |
| direccion | text, nullable | |
| activo | boolean | default true |

### `gastos`
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| caja_turno_id | uuid | FK a `caja_turnos.id` — el gasto siempre sale del turno abierto (RF-6.3) |
| proveedor_id | uuid | FK a `proveedores.id` |
| concepto | text | |
| monto | numeric(12,2) | |
| comprobante_url | text, nullable | ej. foto de la factura del gasto, en Supabase Storage |
| usuario_id | uuid | FK a `perfiles.id`, quien cargó el gasto |
| fecha | timestamptz | default now() |

## Caja

### `caja_turnos`
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| fecha | date | |
| etiqueta_turno | text, nullable | libre, ej. "Mañana"/"Tarde", solo informativo para reportes |
| usuario_apertura_id | uuid | FK a `perfiles.id` |
| monto_apertura | numeric(12,2) | efectivo inicial |
| fecha_apertura | timestamptz | |
| usuario_cierre_id | uuid, nullable | FK a `perfiles.id` |
| monto_cierre_declarado | numeric(12,2), nullable | efectivo contado físicamente al cerrar |
| efectivo_esperado | numeric(12,2), nullable | calculado al cerrar: apertura + ventas efectivo − gastos |
| diferencia | numeric(12,2), nullable | `monto_cierre_declarado - efectivo_esperado` |
| fecha_cierre | timestamptz, nullable | |
| estado | estado_caja_turno | default `abierta` |
| observaciones | text, nullable | |

Constraint: a lo sumo un registro con `estado = 'abierta'` a la vez (índice único parcial) — RF-5.5.

## Bloqueo de caja

### `bloqueo_caja_productos`
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| producto_id | uuid, único | FK a `productos.id` -- hasta 10 filas, límite forzado por RLS |
| created_at | timestamptz | |

### `bloqueo_caja_conteos`
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| caja_turno_id | uuid, único | FK a `caja_turnos.id` -- a lo sumo un conteo por turno |
| usuario_id | uuid | FK a `perfiles.id`, quien contó |
| fecha | timestamptz | |

### `bloqueo_caja_conteo_items`
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| bloqueo_caja_conteo_id | uuid | FK a `bloqueo_caja_conteos.id` |
| producto_id | uuid | FK a `productos.id` |
| stock_sistema | numeric(12,3) | snapshot al momento del conteo |
| stock_contado | numeric(12,3) | ingresado manualmente |
| diferencia | numeric(12,3) | `stock_contado - stock_sistema`, calculada |

Con `configuracion_negocio.bloqueo_caja_activo = true` y al menos un producto en
`bloqueo_caja_productos`, `cerrar_turno` exige que exista un `bloqueo_caja_conteos` para ese
turno antes de dejar cerrarlo. A diferencia de `controles_stock`, esto **nunca ajusta stock ni
pasa por aprobación** — es puramente un registro de auditoría para que el administrador compare
sistema vs. contado y detecte diferencias (control sorpresivo, no un mecanismo de corrección).

## Ofertas (combos)

### `ofertas`
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| nombre | text | |
| descripcion | text, nullable | |
| tipo_beneficio | tipo_beneficio_oferta | |
| valor_beneficio | numeric(12,2) | precio fijo del combo, o % / monto de descuento según `tipo_beneficio` |
| max_aplicaciones_por_venta | int, nullable | null = sin límite — RF-2.4 |
| fecha_inicio / fecha_fin | date, nullable | vigencia |
| activo | boolean | default true |

### `oferta_items`
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| oferta_id | uuid | FK a `ofertas.id` |
| producto_id | uuid | FK a `productos.id` |
| cantidad_requerida | numeric(12,3) | unidades o kg del producto, por cada aplicación del combo |

Constraint: una oferta tiene al menos 2 `oferta_items` (regla de negocio, validada en la capa de
servicio; no siempre expresable como constraint de tabla).

## Descuentos

### `descuentos`
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| nombre | text | |
| descripcion | text, nullable | |
| tipo_efecto | tipo_efecto_descuento | |
| valor_efecto | numeric(12,2) | % o monto fijo sobre el total de la venta |
| fecha_inicio / fecha_fin | date, nullable | |
| activo | boolean | default true |

### `descuento_condiciones`
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| descuento_id | uuid | FK a `descuentos.id` |
| tipo_condicion | tipo_condicion_descuento | |
| monto_minimo | numeric(12,2), nullable | usado si `tipo_condicion = 'monto_minimo'` |
| producto_id | uuid, nullable | FK a `productos.id`, usado si `tipo_condicion = 'producto_incluido'` |
| categoria_id | uuid, nullable | FK a `categorias.id`, usado si `tipo_condicion = 'categoria_incluida'` |
| cantidad_minima | numeric(12,3), nullable | cantidad mínima requerida (unidades o kg) para `producto_incluido`/`categoria_incluida`; default 1 si no se especifica |

Todas las condiciones de un mismo descuento se combinan con **AND** (RF-3.2). Si en el futuro se
necesita OR entre condiciones, se agrega un campo de agrupación lógica.

## Ventas

### `ventas`
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| numero_comprobante | bigint, único | correlativo global, nunca se reinicia (ver nota AFIP en no-funcionales) |
| caja_turno_id | uuid | FK a `caja_turnos.id` |
| usuario_id | uuid | FK a `perfiles.id`, cajero que la realizó |
| subtotal | numeric(12,2) | suma de renglones antes de beneficios (ya incluye el recargo de tarjeta, si corresponde) |
| total_ofertas | numeric(12,2) | beneficio total por combos aplicados, informativo (con recargo aplicado si corresponde) |
| total_descuentos | numeric(12,2) | beneficio total por descuentos aplicados (con recargo aplicado si corresponde) |
| total | numeric(12,2) | monto final a cobrar |
| estado | estado_venta | default `pendiente_pago` si incluye Mercado Pago, `completada` si es efectivo/tarjeta/seña |
| fecha | timestamptz | default now() |
| anulada_por_id | uuid, nullable | FK a `perfiles.id` |
| fecha_anulacion | timestamptz, nullable | |
| motivo_anulacion | text, nullable | |

### `renglones_venta`
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| venta_id | uuid | FK a `ventas.id` |
| producto_id | uuid | FK a `productos.id` |
| cantidad | numeric(12,3) | unidades o kg según `tipo_venta` del producto |
| precio_unitario_snapshot | numeric(12,2) | precio del producto al momento de la venta, ya con el recargo de tarjeta aplicado si corresponde (EPIC 7#E7-9) -- nunca es un ítem de "recargo" aparte, el precio de cada producto sale directamente inflado |
| subtotal | numeric(12,2) | `cantidad * precio_unitario_snapshot` |

### `venta_ofertas_aplicadas`
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| venta_id | uuid | FK a `ventas.id` |
| oferta_id | uuid | FK a `ofertas.id` |
| veces_aplicada | int | |
| monto_beneficio | numeric(12,2) | snapshot del beneficio total otorgado |

### `venta_descuentos_aplicados`
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| venta_id | uuid | FK a `ventas.id` |
| descuento_id | uuid | FK a `descuentos.id` |
| monto_aplicado | numeric(12,2) | snapshot |

### `venta_medios_pago`
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| venta_id | uuid | FK a `ventas.id` |
| medio_pago | medio_pago | |
| monto | numeric(12,2) | porción de la venta cubierta por este medio |
| estado_pago | estado_pago_medio | `acreditado` de inmediato para efectivo/seña/tarjeta; `pendiente` → `acreditado`/`rechazado` para MP |
| mp_payment_id | text, nullable | id de pago de Mercado Pago |
| mp_referencia_externa | text, nullable | referencia propia enviada a MP (para matchear el webhook) |
| fecha_acreditacion | timestamptz, nullable | |

Comprobante en PDF: se genera **on-demand** a partir de `ventas` + `renglones_venta` (+ ofertas/
descuentos/medios de pago aplicados), no se persiste el archivo — mismo patrón que la generación
on-the-fly de QR en `biblioteca-liliana-bodoc-web`. Si más adelante se necesita reimprimir sin
recalcular, se evalúa cachear el PDF en Supabase Storage.

## Stock

### `movimientos_stock`
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| producto_id | uuid | FK a `productos.id` |
| tipo | tipo_movimiento_stock | |
| cantidad | numeric(12,3) | positivo (entrada) o negativo (salida) |
| stock_resultante | numeric(12,3) | stock del producto después de este movimiento |
| referencia_id | uuid, nullable | id de la venta / lote de etiquetas / control de stock que originó el movimiento |
| usuario_id | uuid | FK a `perfiles.id` |
| fecha | timestamptz | default now() |
| motivo | text, nullable | EPIC 14. Obligatorio a nivel de función (no de columna) para `merma`/`consumo_interno`; sin uso para el resto de los tipos |
| empleado_id | uuid, nullable | EPIC 14. FK a `empleados.id`. Solo se completa para `consumo_interno`, y ahí mismo es opcional (permite "consumo del dueño / sin asignar") |

El descuento de stock al confirmar una venta debe hacerse en una función de base de datos
(`SECURITY DEFINER`, transaccional) que lea y actualice `productos.stock_actual` de forma
atómica — mismo patrón que `book_appointment` en `salus-web` — para evitar condiciones de
carrera si dos ventas del mismo producto se confirman casi al mismo tiempo. `registrar_merma` y
`registrar_consumo_interno` (EPIC 14) siguen el mismo patrón.

## Etiquetas

### `etiqueta_lotes`
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| producto_id | uuid | FK a `productos.id` |
| cantidad | int | cantidad de etiquetas generadas — RF-8.2 |
| fecha_vencimiento | date, nullable | impresa en la etiqueta |
| precio_impreso | numeric(12,2) | snapshot del precio del producto al momento de generar |
| usuario_id | uuid | FK a `perfiles.id` |
| fecha_generacion | timestamptz | default now() |

Al crear un lote, si `productos.controla_stock = true`, se incrementa `stock_actual` en
`cantidad` y se crea un `movimientos_stock` con `tipo = 'etiqueta_generada'`.

El código de barras impreso en la etiqueta es el `productos.codigo_barras` (identifica el
producto, no el lote — la fecha de vencimiento va como texto en la etiqueta, no codificada en el
código de barras).

## Control periódico de stock

### `controles_stock`
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| usuario_id | uuid | FK a `perfiles.id`, quien realiza el conteo |
| estado | estado_control_stock | default `en_progreso` |
| usuario_aprobador_id | uuid, nullable | FK a `perfiles.id` — RF-9.4 |
| fecha_inicio | timestamptz | default now() |
| fecha_cierre | timestamptz, nullable | cuando pasa a `pendiente_aprobacion` |
| fecha_aprobacion | timestamptz, nullable | |
| observaciones | text, nullable | |

### `control_stock_detalles`
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| control_stock_id | uuid | FK a `controles_stock.id` |
| producto_id | uuid | FK a `productos.id` (solo productos con `controla_stock = true`) |
| stock_sistema | numeric(12,3) | snapshot del stock al momento del conteo |
| stock_contado | numeric(12,3) | ingresado manualmente |
| diferencia | numeric(12,3) | `stock_contado - stock_sistema`, calculada |

Al aprobar (`estado = 'aprobado'`): por cada detalle con `diferencia != 0` se actualiza
`productos.stock_actual = stock_contado` y se crea un `movimientos_stock` con
`tipo = 'ajuste_control_stock'`.

## Ingreso de mercadería

### `ingresos_mercaderia`
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| usuario_id | uuid | FK a `perfiles.id`, quien carga el ingreso (cajero o admin) |
| estado | estado_ingreso_mercaderia | default `pendiente_aprobacion` |
| usuario_aprobador_id | uuid, nullable | FK a `perfiles.id` — null si sigue pendiente |
| fecha | timestamptz | default now() |
| fecha_aprobacion | timestamptz, nullable | |
| observaciones | text, nullable | |

### `ingreso_mercaderia_items`
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| ingreso_mercaderia_id | uuid | FK a `ingresos_mercaderia.id` |
| producto_id | uuid | FK a `productos.id` (solo productos con `controla_stock = true`) |
| cantidad | numeric(12,3) | > 0, lo que se sumará al stock |
| stock_previo | numeric(12,3) | snapshot al cargar (auditoría, no se usa para calcular el ajuste) |
| stock_resultante | numeric(12,3), nullable | null mientras está pendiente, se completa al aprobar |

Si quien carga (`crear_ingreso_mercaderia`) es administrador, el ingreso nace `aprobado` y la
misma función suma `cantidad` a `productos.stock_actual` de cada item y crea un
`movimientos_stock` con `tipo = 'ingreso_mercaderia'`. Si es cajero, nace `pendiente_aprobacion`
sin tocar stock hasta que `aprobar_ingreso_mercaderia` lo aprueba — ahí el ajuste se calcula sobre
el `stock_actual` vigente en ese momento, no sobre `stock_previo`, para no perder ventas/mermas
concurrentes. A diferencia de `controles_stock`, no hay policies de insert/update para
`authenticated`: las tres transiciones son exclusivamente vía funciones `SECURITY DEFINER`.

## Relaciones — resumen

```
perfiles ──< caja_turnos (apertura/cierre)
perfiles ──< ventas (cajero)
perfiles ──< gastos, etiqueta_lotes, controles_stock, movimientos_stock (usuario)
perfiles ──< ingresos_mercaderia (usuario, usuario_aprobador — EPIC 15)
empleados ──< movimientos_stock (empleado_id, solo consumo_interno — EPIC 14)

categorias ──< productos
productos ──< oferta_items >── ofertas
productos ──< descuento_condiciones >── descuentos
productos ──< renglones_venta >── ventas
productos ──< movimientos_stock
productos ──< etiqueta_lotes
productos ──< control_stock_detalles >── controles_stock
productos ──< ingreso_mercaderia_items >── ingresos_mercaderia

caja_turnos ──< ventas
caja_turnos ──< gastos
caja_turnos ──< bloqueo_caja_conteos
productos ──< bloqueo_caja_productos
productos ──< bloqueo_caja_conteo_items >── bloqueo_caja_conteos

ventas ──< renglones_venta
ventas ──< venta_medios_pago
ventas ──< venta_ofertas_aplicadas >── ofertas
ventas ──< venta_descuentos_aplicados >── descuentos

proveedores ──< gastos
```

## Decisiones confirmadas

- **Lector de código de barras**: USB (entrada tipo teclado). No se necesita componente de
  cámara/permisos para el escaneo en el punto de venta.
- **Ofertas vs. descuentos**: se acumulan (no son excluyentes entre sí) — confirmado.
- **Pesaje**: los productos "por peso" se pesan en el momento de la venta (el cajero ingresa el
  peso, manual o desde balanza conectada, al vender). No hay etiquetas pre-pesadas con precio
  fijo embebido en el código de barras — el código de barras de estos productos identifica al
  producto, nunca un peso específico.
- **Anulación de ventas pagadas con Mercado Pago**: el sistema **no** dispara un reintegro
  automático por API al anular. Solo revierte stock y marca la venta como anulada; el reintegro
  del dinero (si corresponde) lo gestiona el comercio por fuera del sistema, en Mercado Pago
  directamente.
- **Registro de gastos**: lo puede hacer tanto el Cajero (durante su propio turno) como el
  Administrador — actualizado en `requisitos-funcionales.md` RF-6 y RF-10.1.
- **Condiciones de descuento por producto/categoría**: soportan una cantidad mínima configurable
  (no solo presencia) — agregado `cantidad_minima` en `descuento_condiciones`.

- **Modelo de datos original**: nunca llegó a la conversación. Se cierra el punto: este
  documento queda como el modelo de referencia definitivo. Si en algún momento aparece el
  original, se compara y se ajusta lo que difiera, pero no bloquea la implementación.
- **Librería de código de barras y de PDF**: `jsbarcode` para renderizar el código de barras
  (SVG/canvas, cliente) y `window.print()` + CSS `@media print` para etiquetas **y** comprobante
  (sin librería de PDF en servidor) — mismo patrón sin dependencias nuevas que ya usa
  `biblioteca-liliana-bodoc-web` para etiquetas de libros. El diálogo "Guardar como PDF" del
  navegador cubre el requisito de "descargable en PDF" (RF-4.7) sin sumar una dependencia
  nueva. Se reevalúa si más adelante hace falta generar el PDF en servidor (ej. para adjuntarlo
  a un envío automático).
- **Estado inicial de una venta 100% efectivo**: confirmado — `completada` directamente, sin
  pasar por `pendiente_pago`.
- **Recargo por tarjeta (EPIC 7#E7-9)**: 5% débito / 15% crédito, confirmado con el dueño. Nunca
  es un ítem aparte del comprobante — se aplica como factor multiplicativo a todo lo que compone
  el total (renglones, ofertas, descuentos) para que el total final sea exactamente
  `total_original * factor`. No se puede combinar tarjeta con otro medio de pago en la misma
  venta. Tarjeta liquida en el momento (mismo trato que efectivo: `completada`/`acreditado`), no
  pasa por ningún estado pendiente — no hay integración con una pasarela de tarjeta real, es solo
  el registro de que se cobró con la posnet física del comercio.

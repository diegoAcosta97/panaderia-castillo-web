# Requisitos funcionales

Punto de venta (POS) + gestión de stock para un comercio de un solo local que vende artículos
de almacén y productos de panadería. Este documento es la referencia de **qué** debe hacer el
sistema; el detalle de **cómo** se modelan las tablas está en `docs/data-model.md` y las
decisiones de arquitectura/no funcionales en `docs/requisitos-no-funcionales.md`.

Fuera de alcance en esta iteración: facturación electrónica AFIP (se deja el modelo preparado
para no tener que romper cosas después, pero no se integra todavía), multi-sucursal, cuentas de
cliente / programa de fidelización.

## RF-1 — Productos y categorías

- RF-1.1 Un producto pertenece a una categoría (ej. "Almacén", "Panadería", "Bebidas", "Fiambrería").
- RF-1.2 Un producto se vende **por unidad o por peso, nunca por ambos**. El tipo de venta es un
  atributo fijo del producto, definido por el administrador al cargarlo.
  - Productos "por unidad": el stock (si aplica) se lleva en unidades enteras. Esto incluye
    productos empaquetados aunque su nombre mencione un peso (ej. "Marinitas 250g"): ese peso es
    solo descriptivo, el producto se vende y stockea como una unidad.
  - Productos "por peso": se venden a granel/sueltos (ej. fiambre cortado, pan suelto). El precio
    se define por kg y el stock (si aplica) se lleva en kg/gramos.
- RF-1.3 Cada producto indica si **controla stock** o no.
  - Los productos de panadería (de elaboración propia) **no llevan control de stock**,
    independientemente de si se venden por unidad o por peso.
  - Los productos de almacén sí llevan control de stock por defecto.
- RF-1.4 Un producto puede tener un stock mínimo configurado; por debajo de ese mínimo el sistema
  debe señalarlo (listado de "a reponer"). Solo aplica a productos que controlan stock.
- RF-1.5 Un producto tiene un código de barras para ser escaneado en el punto de venta. Si el
  producto no trae uno de fábrica (caso típico de panadería), el sistema le asigna uno interno al
  crearlo.
- RF-1.6 Alta, edición, baja (lógica) y listado/búsqueda de productos y de categorías, solo para
  el rol Administrador.

## RF-2 — Ofertas (combos)

- RF-2.1 Una oferta combina **1 o más productos** que, al aparecer juntos en una venta en las
  cantidades requeridas, disparan un beneficio (precio fijo especial para el combo, o un
  descuento en $ o % sobre la suma de esos productos). Con un solo producto sirve para precios
  por cantidad (ej. "1 docena de facturas a $10.000" = 1 producto, cantidad requerida 12).
  (Revisado 2026-08-21: antes exigía 2 o más productos distintos.)
- RF-2.2 La oferta se aplica **automáticamente** al detectar la combinación en el carrito, sin
  que el cajero tenga que hacer nada.
- RF-2.3 Si hay cantidad suficiente en el carrito, la oferta se aplica **repetidamente** (ej. 4
  unidades de A + 4 de B, combo de 1A+1B → se aplica 4 veces), salvo que tenga un límite.
- RF-2.4 Una oferta puede tener un **máximo de aplicaciones por venta** configurable (opcional;
  sin límite si no se define).
- RF-2.5 Una oferta tiene vigencia (fecha desde/hasta) y puede activarse/desactivarse manualmente.
- RF-2.6 Alta, edición y baja de ofertas, solo Administrador.

## RF-3 — Descuentos

- RF-3.1 Un descuento es una regla que reduce el **total de la venta** (no un renglón puntual),
  en % o en monto fijo.
- RF-3.2 Un descuento se activa cuando la venta cumple **una o más condiciones** configuradas de
  antemano, por ejemplo: monto total mínimo, que la venta incluya al menos una cantidad mínima
  (configurable, por defecto 1) de un producto o categoría determinada, o el medio de pago
  elegido (ej. "5% pagando en efectivo", revisado EPIC 6/E6-7). El conjunto de condiciones de un
  mismo descuento se evalúa en conjunto (todas deben cumplirse). La condición de medio de pago
  solo puede evaluarse en la pantalla de Cobro, una vez elegido — no en el carrito.
- RF-3.3 El descuento se aplica **automáticamente** al cumplirse la condición, sin intervención
  del cajero.
- RF-3.4 Un descuento tiene vigencia (fecha desde/hasta) y puede activarse/desactivarse.
- RF-3.5 Alta, edición y baja de descuentos, solo Administrador.
- RF-3.6 (revisado, EPIC 6) Ofertas y descuentos son excluyentes por venta: si corresponden una o
  más ofertas, todas se aplican (pueden ser varias); un descuento solo se aplica si la venta no
  tiene ninguna oferta aplicada.

## RF-4 — Venta (punto de venta)

- RF-4.1 El cajero arma una venta agregando productos por escaneo de código de barras o
  búsqueda manual; para productos por peso, ingresa el peso vendido.
- RF-4.2 El sistema calcula en tiempo real: subtotal, ofertas aplicadas, descuentos aplicados y
  total a cobrar.
- RF-4.3 Una venta puede pagarse con **uno o más medios de pago combinados**: efectivo, Mercado
  Pago, o efectivo + Mercado Pago repartiendo el monto entre ambos.
- RF-4.4 Pago con Mercado Pago: el sistema genera un QR dinámico por el monto correspondiente; la
  venta queda en estado "pendiente de pago" hasta recibir la confirmación (webhook) de pago
  acreditado, momento en que se confirma sola.
- RF-4.5 Al confirmarse la venta (completada), se descuenta stock de los productos que lo
  controlan (por unidad o por peso según corresponda) y se registra el movimiento de stock.
- RF-4.6 Una venta completada puede anularse (solo Administrador); la anulación revierte el stock
  descontado.
- RF-4.7 Cada venta genera un **comprobante** con numeración correlativa (pensado para poder
  mapearse a futuro con la numeración de comprobantes de AFIP), descargable/imprimible en PDF,
  con el detalle de productos, cantidades, precios, ofertas/descuentos aplicados, medios de pago y
  total.
- RF-4.8 Toda venta queda asociada al turno de caja en el que se realizó.

## RF-5 — Caja

- RF-5.1 Caja única del local, con hasta 2 turnos por día (ej. mañana/tarde).
- RF-5.2 Apertura de turno: registra quién abre, fecha/hora y monto inicial en efectivo.
- RF-5.3 Durante el turno, todas las ventas y gastos en efectivo impactan el efectivo esperado de
  ese turno.
- RF-5.4 Cierre de turno (arqueo): quien cierra cuenta el efectivo físico y lo declara; el sistema
  compara contra el efectivo esperado (apertura + ventas en efectivo − gastos en efectivo) y
  muestra la diferencia.
- RF-5.5 No puede haber dos turnos de caja abiertos al mismo tiempo.
- RF-5.6 Solo Administrador puede ver el historial completo de turnos/cierres y sus diferencias.

## RF-6 — Gastos y proveedores

- RF-6.1 Catálogo de proveedores (nombre, CUIT, contacto).
- RF-6.2 Registro de gastos (ej. pago a proveedor), asociados a un proveedor, con concepto y
  monto. Lo puede registrar tanto el Cajero (durante su propio turno) como el Administrador.
- RF-6.3 Todo gasto se descuenta del efectivo del turno de caja abierto en ese momento (afecta el
  arqueo de cierre — ver RF-5.4).
- RF-6.4 Listado/reporte de gastos por período y por proveedor.

## RF-7 — Integración Mercado Pago

- RF-7.1 Generación de un QR dinámico (Checkout Pro / QR API de Mercado Pago) por el monto exacto
  a cobrar en la venta (o la porción de la venta asignada a este medio de pago, si es combinado).
- RF-7.2 Recepción de notificaciones (webhook) de Mercado Pago para confirmar el pago acreditado
  y actualizar el estado de la venta automáticamente.
- RF-7.3 Manejo de pagos rechazados/expirados: la venta no se confirma y queda disponible para
  reintentar el cobro.

## RF-8 — Etiquetas

- RF-8.1 Generación de etiquetas imprimibles para un producto, con: nombre, fecha de vencimiento,
  precio y código de barras escaneable.
- RF-8.2 Al generar etiquetas se indica la **cantidad** a imprimir; para productos que controlan
  stock, esa cantidad se **suma automáticamente al stock** del producto (ahorra el paso de
  cargar stock por separado).
- RF-8.3 Impresión en hoja A4 con grilla de etiquetas (impresora común), vía diálogo de impresión
  del navegador.

## RF-9 — Control periódico de stock

- RF-9.1 El administrador (o quien se designe) puede iniciar un conteo físico de stock: para cada
  producto que controla stock, ingresa la cantidad contada físicamente.
- RF-9.2 El sistema muestra la diferencia entre el stock del sistema y el contado físicamente
  (faltantes o sobrantes).
- RF-9.3 El conteo y sus diferencias quedan registrados para análisis histórico.
- RF-9.4 El ajuste real del stock **no es automático**: requiere una aprobación aparte (rol
  Administrador) antes de modificar el stock del sistema.

## RF-10 — Usuarios y roles

- RF-10.1 Dos roles: **Administrador** (gestiona productos, categorías, ofertas, descuentos,
  proveedores, ve reportes, aprueba ajustes de stock, ve historial de caja, puede anular ventas) y
  **Cajero** (opera el punto de venta: vende, abre/cierra su propio turno de caja, genera
  etiquetas, registra gastos durante su turno).
- RF-10.2 Login con usuario/contraseña (Supabase Auth). Es la **única puerta de entrada**: no
  hay ninguna pantalla accesible sin sesión iniciada. Tras loguearse, el sistema lleva al cajero
  directo al punto de venta y al administrador al panel de administración (que además le permite
  entrar al punto de venta si necesita vender).
- RF-10.3 La sesión caduca por inactividad a la hora (60 minutos sin uso); al vencer, cualquier
  acción vuelve a pedir login. No afecta un turno de caja que haya quedado abierto.

## RF-11 — Merma y consumo interno

- RF-11.1 El sistema permite registrar la salida de stock de un producto por **merma** (rotura,
  vencimiento, deterioro) con un motivo obligatorio. Lo puede registrar tanto el Cajero como el
  Administrador, sin aprobación previa — a diferencia del ajuste de un control de stock (RF-9.4),
  es un hecho presenciado directamente por quien lo registra, no una diferencia a investigar.
- RF-11.2 El sistema permite registrar la salida de stock de un producto por **consumo interno**
  (personal o dueño), con un motivo obligatorio y, opcionalmente, el empleado que consumió. Mismo
  criterio de permisos que RF-11.1.
- RF-11.3 Ninguna de las dos operaciones puede dejar el stock del sistema en negativo: se
  rechazan si la cantidad supera el stock actual del producto.
- RF-11.4 Ambos movimientos quedan en el mismo historial auditable que el resto de los
  movimientos de stock (RF-9.3), visibles por producto y por usuario que los registró, para poder
  detectar patrones (ej. un usuario que registra merma con frecuencia inusual).

## Decisiones confirmadas

- **Lector de código de barras**: USB (funciona como entrada de teclado — el foco de la pantalla
  de venta captura el escaneo como si fuera tipeado + Enter, sin cámara ni permisos de navegador
  de por medio).
- **Ofertas (combos) vs. descuentos**: el modelo descripto en RF-2 y RF-3 (combo automático y
  repetible por cantidad de productos vs. regla condicional automática sobre el total de la
  venta) refleja correctamente lo que necesita el negocio.

## Preguntas abiertas / a confirmar

- **Modelo de datos original**: seguís sin adjuntarlo — si en algún momento lo encontrás, lo
  comparamos contra este documento y ajustamos lo que difiera.

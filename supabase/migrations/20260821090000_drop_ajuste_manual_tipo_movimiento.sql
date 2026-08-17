-- E3-3 cleanup: 'ajuste_manual' era un tipo de movimiento reservado desde el diseño original del
-- enum (docs/backlog/03-productos.md#E3-3) pero nunca tuvo una pantalla que lo escribiera -- los
-- ajustes reales de stock quedaron cubiertos por vías dedicadas y auditadas
-- (ajuste_control_stock, ingreso_mercaderia, merma, consumo_interno). Se saca del enum para no
-- dejar una opción muerta en el filtro del histórico de movimientos.
--
-- Postgres no soporta `alter type ... drop value`: hay que recrear el enum sin el valor y
-- reapuntar la columna que lo usa. Verificado contra la base real antes de este cambio que no
-- hay ninguna fila con tipo = 'ajuste_manual' (select tipo, count(*) from movimientos_stock
-- group by tipo), así que el `using` cast de abajo no puede fallar.

alter type public.tipo_movimiento_stock rename to tipo_movimiento_stock_old;

create type public.tipo_movimiento_stock as enum (
  'venta',
  'anulacion_venta',
  'etiqueta_generada',
  'ajuste_control_stock',
  'alta_inicial',
  'merma',
  'consumo_interno',
  'ingreso_mercaderia'
);

alter table public.movimientos_stock
  alter column tipo type public.tipo_movimiento_stock
  using tipo::text::public.tipo_movimiento_stock;

drop type public.tipo_movimiento_stock_old;

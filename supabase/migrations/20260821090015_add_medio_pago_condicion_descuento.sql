-- E6-7: condición de descuento por medio de pago (docs/backlog/06-ofertas-descuentos.md) --
-- permite armar, por ejemplo, "5% de descuento pagando en efectivo".
--
-- `alter type ... add value` va en su propia migración porque un valor de enum recién agregado
-- no se puede usar en la misma transacción que lo crea -- mismo criterio que
-- 20260811090000_add_merma_consumo_interno.sql. La columna nueva de descuento_condiciones que lo
-- usa va en la siguiente migración, ya con este commit aplicado.

alter type public.tipo_condicion_descuento add value 'medio_pago';

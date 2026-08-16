-- E15-1: nuevo tipo de movimiento para ingreso de mercadería (docs/backlog/15-ingreso-mercaderia.md)
--
-- `alter type ... add value` va en su propia migración porque un valor de enum recién agregado
-- no se puede usar en la misma transacción que lo crea -- mismo criterio que
-- 20260811090000_add_merma_consumo_interno.sql. La función que lo usa (crear_ingreso_mercaderia)
-- va en una migración siguiente, ya con este commit aplicado.

alter type public.tipo_movimiento_stock add value 'ingreso_mercaderia';

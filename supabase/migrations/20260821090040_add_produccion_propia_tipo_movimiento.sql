-- E16-2: nuevo tipo de movimiento de stock para producción propia (docs/backlog/16-produccion.md)
-- -- incremento de stock por producción interna, distinto de ingreso_mercaderia (compra a
-- proveedor). `alter type ... add value` va en su propia migración porque un valor de enum recién
-- agregado no se puede usar en la misma transacción que lo crea -- mismo criterio que
-- 20260811090000_add_merma_consumo_interno.sql / 20260816090000_add_ingreso_mercaderia_tipo_movimiento.sql.
-- La función que lo usa (completar_produccion) va en una migración siguiente, ya con este commit
-- aplicado.

alter type public.tipo_movimiento_stock add value 'produccion_propia';

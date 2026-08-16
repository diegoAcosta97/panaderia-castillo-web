-- E7-9: nuevos medios de pago con recargo (docs/backlog/07-punto-de-venta.md)
--
-- En su propia migración/transacción: un valor de enum recién agregado no se puede usar en la
-- misma transacción que lo crea -- mismo criterio que 20260815100025_add_sena_pedido_medio_pago.sql.
-- La actualización de confirmar_venta que usa estos dos valores va en la migración siguiente.

alter type public.medio_pago add value 'tarjeta_debito';
alter type public.medio_pago add value 'tarjeta_credito';

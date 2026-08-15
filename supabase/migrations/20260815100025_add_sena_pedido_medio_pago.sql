-- Nuevo valor de medio_pago para representar, en la venta final de despacho de un pedido por
-- encargo, el importe ya cobrado como seña en un turno anterior -- se descuenta del total a
-- cobrar ahora, no vuelve a impactar el turno de hoy (la seña ya impactó el suyo al cobrarse).
-- En su propia migración/transacción: un valor de enum recién agregado no se puede usar en la
-- misma transacción que lo crea.

alter type public.medio_pago add value 'sena_pedido';

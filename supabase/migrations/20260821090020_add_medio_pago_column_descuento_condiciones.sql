-- E6-7: columna para la condición 'medio_pago' agregada en la migración anterior. Se excluye
-- 'sena_pedido' porque no es un medio que el cajero elija en la pantalla de Cobro (es el saldo ya
-- pagado de un pedido por encargo, se aplica solo) -- el resto (efectivo, mercado_pago,
-- tarjeta_debito, tarjeta_credito) sí son opciones reales de PantallaCobro.
--
-- Este descuento solo se puede evaluar una vez elegido el medio de pago, es decir en
-- PantallaCobro (features/ventas/components/PantallaCobro.tsx), no en el carrito -- mismo
-- momento en el que hoy se decide el recargo por tarjeta. Se aplica igual que cualquier otro
-- descuento (línea "Descuento: X -$Y" restada del subtotal, mismo camino ya existente en
-- confirmar_venta), no como el factor oculto del recargo de tarjeta.

alter table public.descuento_condiciones
  add column medio_pago public.medio_pago,
  add constraint descuento_condicion_medio_pago_valido
    check (medio_pago is null or medio_pago <> 'sena_pedido');

alter table public.descuento_condiciones
  drop constraint descuento_condicion_campo_correspondiente;

alter table public.descuento_condiciones
  add constraint descuento_condicion_campo_correspondiente check (
    (tipo_condicion = 'monto_minimo'
      and monto_minimo is not null and producto_id is null and categoria_id is null
      and medio_pago is null)
    or (tipo_condicion = 'producto_incluido'
      and producto_id is not null and monto_minimo is null and categoria_id is null
      and medio_pago is null)
    or (tipo_condicion = 'categoria_incluida'
      and categoria_id is not null and monto_minimo is null and producto_id is null
      and medio_pago is null)
    or (tipo_condicion = 'medio_pago'
      and medio_pago is not null and monto_minimo is null and producto_id is null
      and categoria_id is null)
  );

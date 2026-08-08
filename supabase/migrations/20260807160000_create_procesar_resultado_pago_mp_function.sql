-- E8-3: aplica el resultado de un pago de Mercado Pago ya verificado (docs/backlog/08-mercadopago.md)
--
-- A diferencia de confirmar_venta/anular_venta/registrar_qr_pago, esta función NO chequea
-- auth.uid(): la llama el webhook (app/api/mercadopago/webhook/route.ts) con el cliente admin
-- (service_role), sin sesión de usuario -- Mercado Pago le pega directo a nuestro servidor, no
-- hay cookie de nadie. Por eso mismo se revoca el permiso de ejecutarla tanto a `public` como a
-- `authenticated`: ningún usuario logueado puede invocarla por su cuenta, ni siquiera un
-- administrador -- el resultado del pago solo puede venir de re-consultar la API de Mercado
-- Pago (ver la función procesar_resultado_pago_mp del lado del servidor Next.js, no de acá dentro).
--
-- Idempotente: si el medio de pago ya no está 'pendiente' (un reintento del webhook, algo que
-- Mercado Pago puede hacer), no vuelve a tocar nada.

create or replace function public.procesar_resultado_pago_mp(
  p_mp_referencia_externa text,
  p_mp_payment_id text,
  p_acreditado boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_medio record;
  v_venta record;
  v_todos_acreditados boolean;
  v_renglon record;
  v_producto record;
  v_stock_nuevo numeric(12, 3);
begin
  select * into v_medio
  from public.venta_medios_pago
  where mp_referencia_externa = p_mp_referencia_externa
    and medio_pago = 'mercado_pago'
  for update;

  if not found then
    raise exception 'No se encontró ningún medio de pago con esa referencia.';
  end if;

  if v_medio.estado_pago <> 'pendiente' then
    return jsonb_build_object('ya_procesado', true, 'venta_id', v_medio.venta_id);
  end if;

  if not p_acreditado then
    -- RF-7.3: pago rechazado/expirado -- la venta queda pendiente_pago, disponible para
    -- reintentar el cobro (generar un QR nuevo), no se toca stock.
    update public.venta_medios_pago set estado_pago = 'rechazado' where id = v_medio.id;
    return jsonb_build_object('acreditado', false, 'venta_id', v_medio.venta_id);
  end if;

  update public.venta_medios_pago
  set estado_pago = 'acreditado', mp_payment_id = p_mp_payment_id, fecha_acreditacion = now()
  where id = v_medio.id;

  select bool_and(estado_pago = 'acreditado') into v_todos_acreditados
  from public.venta_medios_pago
  where venta_id = v_medio.venta_id;

  if not v_todos_acreditados then
    -- Venta con más de un medio de pago (combinado): falta que se acredite el otro todavía.
    return jsonb_build_object('acreditado', true, 'venta_completada', false, 'venta_id', v_medio.venta_id);
  end if;

  select * into v_venta from public.ventas where id = v_medio.venta_id for update;

  if v_venta.estado <> 'pendiente_pago' then
    -- Ya se había completado (u otra rama) por otra vía -- no descontar stock dos veces.
    return jsonb_build_object(
      'acreditado', true,
      'venta_completada', v_venta.estado = 'completada',
      'venta_id', v_venta.id
    );
  end if;

  for v_renglon in
    select producto_id, cantidad from public.renglones_venta where venta_id = v_venta.id
  loop
    select * into v_producto from public.productos where id = v_renglon.producto_id for update;
    if v_producto.controla_stock then
      v_stock_nuevo := v_producto.stock_actual - v_renglon.cantidad;
      update public.productos set stock_actual = v_stock_nuevo, updated_at = now()
        where id = v_producto.id;
      insert into public.movimientos_stock (producto_id, tipo, cantidad, stock_resultante, referencia_id, usuario_id)
      values (v_producto.id, 'venta', -v_renglon.cantidad, v_stock_nuevo, v_venta.id, v_venta.usuario_id);
    end if;
  end loop;

  update public.ventas set estado = 'completada' where id = v_venta.id;

  return jsonb_build_object(
    'acreditado', true,
    'venta_completada', true,
    'venta_id', v_venta.id,
    'numero_comprobante', v_venta.numero_comprobante
  );
end;
$$;

revoke all on function public.procesar_resultado_pago_mp(text, text, boolean) from public;
revoke all on function public.procesar_resultado_pago_mp(text, text, boolean) from authenticated;

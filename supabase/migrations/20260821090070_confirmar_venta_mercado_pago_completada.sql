-- Pedido del dueño (2026-08-17): "por el momento" el pago con Mercado Pago se cobra igual que
-- una tarjeta -- el cajero lo carga a mano en el POSNET de Mercado Pago (no en el QR estático de
-- E8-2) y confirma la venta al toque, sin esperar la acreditación. Antes 'mercado_pago' era el
-- único medio que dejaba la venta en 'pendiente_pago' (ver docs/backlog/08-mercadopago.md#E8-2 a
-- E8-4: QR estático + webhook + PantallaVenta.EsperandoPagoMP haciendo polling) -- ese circuito
-- sigue existiendo en el código (no se borró: `generarQrParaVenta`/`EsperandoPagoMP` en
-- PantallaVenta), pero con este cambio nunca se dispara, porque confirmar_venta ya no devuelve
-- 'pendiente_pago' para 'mercado_pago'. Revertir esta migración (sacar 'mercado_pago' de las dos
-- listas de abajo) reactiva el circuito de QR/webhook tal cual estaba.
--
-- Sin recargo: a diferencia de tarjeta_debito/tarjeta_credito, 'mercado_pago' no suma factor --
-- v_factor sigue en 1 salvo que v_medios_tarjeta > 0, y ese chequeo no cambia acá.

create or replace function public.confirmar_venta(
  p_caja_turno_id uuid,
  p_renglones jsonb,
  p_ofertas jsonb,
  p_descuentos jsonb,
  p_medios_pago jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usuario_id uuid := auth.uid();
  v_renglon record;
  v_venta_renglon record;
  v_producto record;
  v_subtotal numeric(12, 2) := 0;
  v_total_ofertas numeric(12, 2) := 0;
  v_total_descuentos numeric(12, 2) := 0;
  v_total numeric(12, 2);
  v_suma_medios numeric(12, 2) := 0;
  v_estado public.estado_venta;
  v_venta_id uuid;
  v_numero_comprobante bigint;
  v_stock_nuevo numeric(12, 3);
  v_factor numeric(6, 4) := 1;
  v_medios_tarjeta int;
  v_precio_efectivo numeric(12, 2);
  v_tolerancia numeric(12, 2);
begin
  if v_usuario_id is null then
    raise exception 'No hay sesión.';
  end if;

  if not exists (
    select 1 from public.caja_turnos where id = p_caja_turno_id and estado = 'abierta'
  ) then
    raise exception 'El turno de caja no está abierto.';
  end if;

  if (select count(*) from jsonb_array_elements(p_renglones)) = 0 then
    raise exception 'La venta no tiene renglones.';
  end if;

  if (select count(*) from jsonb_array_elements(p_ofertas)) > 0
     and (select count(*) from jsonb_array_elements(p_descuentos)) > 0 then
    raise exception 'No se puede aplicar un descuento junto con una oferta en la misma venta.';
  end if;

  select count(*) into v_medios_tarjeta
  from jsonb_array_elements(p_medios_pago) x
  where x ->> 'medio_pago' in ('tarjeta_debito', 'tarjeta_credito');

  if v_medios_tarjeta > 0 then
    if (select count(*) from jsonb_array_elements(p_medios_pago)) <> 1 then
      raise exception 'El pago con tarjeta no se puede combinar con otro medio de pago.';
    end if;
    v_factor := case p_medios_pago -> 0 ->> 'medio_pago'
      when 'tarjeta_debito' then 1.05
      when 'tarjeta_credito' then 1.15
    end;
  end if;

  -- 1) Bloquear cada producto y validar stock suficiente ANTES de escribir nada. Agrupado por
  --    producto_id (ver nota de E7-3) -- el precio no afecta cuánto stock se descuenta.
  for v_renglon in
    select producto_id, sum(cantidad) as cantidad
    from jsonb_to_recordset(p_renglones) as x(producto_id uuid, cantidad numeric)
    group by producto_id
  loop
    select * into v_producto from public.productos where id = v_renglon.producto_id for update;
    if not found then
      raise exception 'El producto % no existe.', v_renglon.producto_id;
    end if;
    if v_producto.controla_stock and v_producto.stock_actual < v_renglon.cantidad then
      raise exception 'Stock insuficiente para "%": disponible %, pedido %',
        v_producto.nombre, v_producto.stock_actual, v_renglon.cantidad;
    end if;
  end loop;

  -- 2) Precio efectivo de cada línea (agrupada por producto_id + precio_unitario solicitado) y
  --    subtotal total -- ya con el recargo de tarjeta (v_factor) aplicado, para que el total sea
  --    consistente con lo que se valida contra p_medios_pago más abajo.
  for v_venta_renglon in
    select producto_id, precio_unitario as precio_unitario_solicitado, sum(cantidad) as cantidad
    from jsonb_to_recordset(p_renglones)
      as x(producto_id uuid, cantidad numeric, precio_unitario numeric)
    group by producto_id, precio_unitario
  loop
    select * into v_producto from public.productos where id = v_venta_renglon.producto_id;

    if v_venta_renglon.precio_unitario_solicitado is not null then
      v_tolerancia := greatest(v_producto.precio * 0.001, 0.01);
      if v_venta_renglon.cantidad * abs(v_venta_renglon.precio_unitario_solicitado - v_producto.precio)
         > v_tolerancia then
        raise exception 'El precio informado para "%" está fuera de la tolerancia permitida.',
          v_producto.nombre;
      end if;
      v_precio_efectivo := v_venta_renglon.precio_unitario_solicitado;
    else
      v_precio_efectivo := v_producto.precio;
    end if;

    v_subtotal := v_subtotal + (v_venta_renglon.cantidad * v_precio_efectivo * v_factor);
  end loop;

  select coalesce(sum((x ->> 'monto_beneficio')::numeric), 0) * v_factor into v_total_ofertas
  from jsonb_array_elements(p_ofertas) x;

  select coalesce(sum((x ->> 'monto_aplicado')::numeric), 0) * v_factor into v_total_descuentos
  from jsonb_array_elements(p_descuentos) x;

  v_total := v_subtotal - v_total_ofertas - v_total_descuentos;

  select coalesce(sum((x ->> 'monto')::numeric), 0) into v_suma_medios
  from jsonb_array_elements(p_medios_pago) x;

  if v_suma_medios <> v_total then
    raise exception 'La suma de los medios de pago (%) no coincide con el total (%).',
      v_suma_medios, v_total;
  end if;

  select case
    when bool_and(
      x ->> 'medio_pago' in ('efectivo', 'sena_pedido', 'tarjeta_debito', 'tarjeta_credito', 'mercado_pago')
    ) then 'completada'::public.estado_venta
    else 'pendiente_pago'::public.estado_venta
  end into v_estado
  from jsonb_array_elements(p_medios_pago) x;

  insert into public.ventas (
    caja_turno_id, usuario_id, subtotal, total_ofertas, total_descuentos, total, estado
  )
  values (
    p_caja_turno_id, v_usuario_id, v_subtotal, v_total_ofertas, v_total_descuentos, v_total, v_estado
  )
  returning id, numero_comprobante into v_venta_id, v_numero_comprobante;

  -- 3) Renglones (agrupados por producto_id + precio_unitario, ver nota arriba) + descuento de
  --    stock (agrupado solo por producto_id -- si un mismo producto quedó en más de un grupo de
  --    precio, cada iteración descuenta su parte del stock actual, que ya refleja lo descontado
  --    por la iteración anterior dentro de la misma transacción). precio_unitario_snapshot/
  --    subtotal ya llevan el recargo de tarjeta aplicado, igual que antes.
  for v_venta_renglon in
    select producto_id, precio_unitario as precio_unitario_solicitado, sum(cantidad) as cantidad
    from jsonb_to_recordset(p_renglones)
      as x(producto_id uuid, cantidad numeric, precio_unitario numeric)
    group by producto_id, precio_unitario
  loop
    select * into v_producto from public.productos where id = v_venta_renglon.producto_id;

    v_precio_efectivo := coalesce(v_venta_renglon.precio_unitario_solicitado, v_producto.precio);

    insert into public.renglones_venta (
      venta_id, producto_id, cantidad, precio_unitario_snapshot, costo_unitario_snapshot, subtotal
    )
    values (v_venta_id, v_venta_renglon.producto_id, v_venta_renglon.cantidad, v_precio_efectivo * v_factor,
      v_producto.costo, v_venta_renglon.cantidad * v_precio_efectivo * v_factor);

    if v_estado = 'completada' and v_producto.controla_stock then
      v_stock_nuevo := v_producto.stock_actual - v_venta_renglon.cantidad;
      update public.productos set stock_actual = v_stock_nuevo, updated_at = now()
        where id = v_producto.id;
      insert into public.movimientos_stock (producto_id, tipo, cantidad, stock_resultante, referencia_id, usuario_id)
      values (v_producto.id, 'venta', -v_venta_renglon.cantidad, v_stock_nuevo, v_venta_id, v_usuario_id);
    end if;
  end loop;

  insert into public.venta_ofertas_aplicadas (venta_id, oferta_id, veces_aplicada, monto_beneficio)
  select v_venta_id, (x ->> 'oferta_id')::uuid, (x ->> 'veces_aplicada')::int,
    (x ->> 'monto_beneficio')::numeric * v_factor
  from jsonb_array_elements(p_ofertas) x;

  insert into public.venta_descuentos_aplicados (venta_id, descuento_id, monto_aplicado)
  select v_venta_id, (x ->> 'descuento_id')::uuid, (x ->> 'monto_aplicado')::numeric * v_factor
  from jsonb_array_elements(p_descuentos) x;

  insert into public.venta_medios_pago (venta_id, medio_pago, monto, estado_pago)
  select
    v_venta_id,
    (x ->> 'medio_pago')::public.medio_pago,
    (x ->> 'monto')::numeric,
    case when (x ->> 'medio_pago') in
      ('efectivo', 'sena_pedido', 'tarjeta_debito', 'tarjeta_credito', 'mercado_pago')
      then 'acreditado'::public.estado_pago_medio
      else 'pendiente'::public.estado_pago_medio
    end
  from jsonb_array_elements(p_medios_pago) x;

  return jsonb_build_object(
    'venta_id', v_venta_id,
    'numero_comprobante', v_numero_comprobante,
    'estado', v_estado
  );
end;
$$;

revoke all on function public.confirmar_venta(uuid, jsonb, jsonb, jsonb, jsonb) from public;
grant execute on function public.confirmar_venta(uuid, jsonb, jsonb, jsonb, jsonb) to authenticated;

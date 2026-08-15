-- Agrega costo_unitario_snapshot al insert de renglones_venta que ya hace confirmar_venta --
-- v_producto (bloqueado con `for update` más arriba en la función) ya tiene la columna `costo`
-- en scope, no hace falta ninguna query nueva. Resto de la función sin cambios (docs/backlog no
-- documenta esta epic, ver PR).

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
    v_subtotal := v_subtotal + (v_renglon.cantidad * v_producto.precio);
  end loop;

  select coalesce(sum((x ->> 'monto_beneficio')::numeric), 0) into v_total_ofertas
  from jsonb_array_elements(p_ofertas) x;

  select coalesce(sum((x ->> 'monto_aplicado')::numeric), 0) into v_total_descuentos
  from jsonb_array_elements(p_descuentos) x;

  v_total := v_subtotal - v_total_ofertas - v_total_descuentos;

  select coalesce(sum((x ->> 'monto')::numeric), 0) into v_suma_medios
  from jsonb_array_elements(p_medios_pago) x;

  if v_suma_medios <> v_total then
    raise exception 'La suma de los medios de pago (%) no coincide con el total (%).',
      v_suma_medios, v_total;
  end if;

  select case
    when bool_and(x ->> 'medio_pago' = 'efectivo') then 'completada'::public.estado_venta
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

  for v_renglon in
    select producto_id, sum(cantidad) as cantidad
    from jsonb_to_recordset(p_renglones) as x(producto_id uuid, cantidad numeric)
    group by producto_id
  loop
    select * into v_producto from public.productos where id = v_renglon.producto_id;

    insert into public.renglones_venta (
      venta_id, producto_id, cantidad, precio_unitario_snapshot, costo_unitario_snapshot, subtotal
    )
    values (v_venta_id, v_renglon.producto_id, v_renglon.cantidad, v_producto.precio,
      v_producto.costo, v_renglon.cantidad * v_producto.precio);

    if v_estado = 'completada' and v_producto.controla_stock then
      v_stock_nuevo := v_producto.stock_actual - v_renglon.cantidad;
      update public.productos set stock_actual = v_stock_nuevo, updated_at = now()
        where id = v_producto.id;
      insert into public.movimientos_stock (producto_id, tipo, cantidad, stock_resultante, referencia_id, usuario_id)
      values (v_producto.id, 'venta', -v_renglon.cantidad, v_stock_nuevo, v_venta_id, v_usuario_id);
    end if;
  end loop;

  insert into public.venta_ofertas_aplicadas (venta_id, oferta_id, veces_aplicada, monto_beneficio)
  select v_venta_id, (x ->> 'oferta_id')::uuid, (x ->> 'veces_aplicada')::int, (x ->> 'monto_beneficio')::numeric
  from jsonb_array_elements(p_ofertas) x;

  insert into public.venta_descuentos_aplicados (venta_id, descuento_id, monto_aplicado)
  select v_venta_id, (x ->> 'descuento_id')::uuid, (x ->> 'monto_aplicado')::numeric
  from jsonb_array_elements(p_descuentos) x;

  insert into public.venta_medios_pago (venta_id, medio_pago, monto, estado_pago)
  select
    v_venta_id,
    (x ->> 'medio_pago')::public.medio_pago,
    (x ->> 'monto')::numeric,
    case when (x ->> 'medio_pago') = 'efectivo'
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

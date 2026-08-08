-- E10-2: genera un lote de etiquetas y, si el producto controla stock, suma `cantidad` a
-- `stock_actual` en la misma transacción (RF-8.2). Mismo patrón que confirmar_venta: bloquea la
-- fila del producto (`for update`) para que dos generaciones concurrentes del mismo producto no
-- pisen el stock resultante.

create or replace function public.generar_lote_etiquetas(
  p_producto_id uuid,
  p_cantidad int,
  p_fecha_vencimiento date
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usuario_id uuid := auth.uid();
  v_producto record;
  v_lote_id uuid;
  v_stock_nuevo numeric(12, 3);
begin
  if v_usuario_id is null then
    raise exception 'No hay sesión.';
  end if;

  if p_cantidad <= 0 then
    raise exception 'La cantidad debe ser mayor a cero.';
  end if;

  select * into v_producto from public.productos where id = p_producto_id for update;
  if not found then
    raise exception 'El producto % no existe.', p_producto_id;
  end if;

  insert into public.etiqueta_lotes
    (producto_id, cantidad, fecha_vencimiento, precio_impreso, usuario_id)
  values
    (p_producto_id, p_cantidad, p_fecha_vencimiento, v_producto.precio, v_usuario_id)
  returning id into v_lote_id;

  if v_producto.controla_stock then
    v_stock_nuevo := v_producto.stock_actual + p_cantidad;
    update public.productos set stock_actual = v_stock_nuevo, updated_at = now()
      where id = v_producto.id;
    insert into public.movimientos_stock
      (producto_id, tipo, cantidad, stock_resultante, referencia_id, usuario_id)
    values
      (v_producto.id, 'etiqueta_generada', p_cantidad, v_stock_nuevo, v_lote_id, v_usuario_id);
  end if;

  return jsonb_build_object(
    'lote_id', v_lote_id,
    'cantidad', p_cantidad,
    'precio_impreso', v_producto.precio,
    'fecha_vencimiento', p_fecha_vencimiento
  );
end;
$$;

revoke all on function public.generar_lote_etiquetas(uuid, int, date) from public;
grant execute on function public.generar_lote_etiquetas(uuid, int, date) to authenticated;

-- Alta atómica de un pedido por encargo + sus items -- mismo criterio que confirmar_venta: si el
-- insert de items fallara a mitad de camino, no queremos un pedido huérfano sin productos.

create or replace function public.crear_pedido_encargo(
  p_cliente_nombre text,
  p_cliente_telefono text,
  p_fecha_entrega date,
  p_notas text,
  p_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usuario_id uuid := auth.uid();
  v_pedido_id uuid;
  v_item record;
begin
  if v_usuario_id is null then
    raise exception 'No hay sesión.';
  end if;

  if coalesce(trim(p_cliente_nombre), '') = '' then
    raise exception 'El nombre del cliente es obligatorio.';
  end if;

  if (select count(*) from jsonb_array_elements(p_items)) = 0 then
    raise exception 'El pedido no tiene productos.';
  end if;

  for v_item in
    select producto_id, cantidad
    from jsonb_to_recordset(p_items) as x(producto_id uuid, cantidad numeric)
  loop
    if v_item.cantidad <= 0 then
      raise exception 'La cantidad debe ser mayor a 0.';
    end if;
    if not exists (select 1 from public.productos where id = v_item.producto_id) then
      raise exception 'El producto % no existe.', v_item.producto_id;
    end if;
  end loop;

  insert into public.pedidos_encargo (cliente_nombre, cliente_telefono, fecha_entrega, notas, usuario_id)
  values (trim(p_cliente_nombre), nullif(trim(coalesce(p_cliente_telefono, '')), ''), p_fecha_entrega,
    nullif(trim(coalesce(p_notas, '')), ''), v_usuario_id)
  returning id into v_pedido_id;

  insert into public.pedido_encargo_items (pedido_id, producto_id, cantidad)
  select v_pedido_id, (x ->> 'producto_id')::uuid, (x ->> 'cantidad')::numeric
  from jsonb_array_elements(p_items) x;

  return v_pedido_id;
end;
$$;

revoke all on function public.crear_pedido_encargo(text, text, date, text, jsonb) from public;
grant execute on function public.crear_pedido_encargo(text, text, date, text, jsonb) to authenticated;

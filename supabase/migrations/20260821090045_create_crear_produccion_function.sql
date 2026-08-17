-- E16-3: alta atómica de una producción + sus items planificados (docs/backlog/16-produccion.md)
-- -- solo administrador (is_administrador(), a diferencia de crear_ingreso_mercaderia que
-- cualquier autenticado puede llamar). Valida que cada producto controle stock y pertenezca a una
-- categoría habilitada para producción -- defensa server-side, no solo el filtro del selector en
-- la UI.

create or replace function public.crear_produccion(
  p_empleado_id uuid,
  p_fecha_pedido date,
  p_fecha_entrega date,
  p_items jsonb,
  p_observaciones text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usuario_id uuid := auth.uid();
  v_produccion_id uuid;
  v_item record;
  v_producto record;
begin
  if v_usuario_id is null then
    raise exception 'No hay sesión.';
  end if;

  if not public.is_administrador() then
    raise exception 'No autorizado.';
  end if;

  if not exists (select 1 from public.empleados where id = p_empleado_id and activo) then
    raise exception 'El empleado no existe o no está activo.';
  end if;

  if p_fecha_entrega < p_fecha_pedido then
    raise exception 'La fecha de entrega no puede ser anterior a la fecha de pedido.';
  end if;

  if (select count(*) from jsonb_array_elements(p_items)) = 0 then
    raise exception 'La producción no tiene productos.';
  end if;

  insert into public.producciones (empleado_id, usuario_id, fecha_pedido, fecha_entrega, observaciones)
  values (
    p_empleado_id, v_usuario_id, p_fecha_pedido, p_fecha_entrega,
    nullif(trim(coalesce(p_observaciones, '')), '')
  )
  returning id into v_produccion_id;

  for v_item in
    select producto_id, cantidad
    from jsonb_to_recordset(p_items) as x(producto_id uuid, cantidad numeric)
  loop
    if v_item.cantidad <= 0 then
      raise exception 'La cantidad debe ser mayor a 0.';
    end if;

    select p.*, c.habilitada_produccion into v_producto
      from public.productos p
      join public.categorias c on c.id = p.categoria_id
      where p.id = v_item.producto_id;
    if not found then
      raise exception 'El producto % no existe.', v_item.producto_id;
    end if;
    if not v_producto.controla_stock then
      raise exception '"%" no controla stock: no se puede incluir en una producción.', v_producto.nombre;
    end if;
    if not v_producto.habilitada_produccion then
      raise exception '"%" no pertenece a una categoría habilitada para producción.', v_producto.nombre;
    end if;

    insert into public.produccion_items (produccion_id, producto_id, cantidad_pedida)
    values (v_produccion_id, v_item.producto_id, v_item.cantidad);
  end loop;

  return jsonb_build_object('id', v_produccion_id);
end;
$$;

revoke all on function public.crear_produccion(uuid, date, date, jsonb, text) from public;
grant execute on function public.crear_produccion(uuid, date, date, jsonb, text) to authenticated;

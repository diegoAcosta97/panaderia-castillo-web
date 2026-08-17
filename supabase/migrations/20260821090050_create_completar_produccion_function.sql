-- E16-4: confirmar una producción pendiente (docs/backlog/16-produccion.md) -- solo administrador.
-- Ratifica la cantidad realmente producida de cada item planificado (para ver faltantes/sobras,
-- RF del dueño) y admite productos nuevos no planificados (cantidad_pedida = 0 en ese caso). Cada
-- producto con cantidad_producida > 0 suma stock_actual y deja un movimiento 'produccion_propia'
-- -- 0 es un valor válido (faltante total de ese item), simplemente no genera movimiento.
--
-- Exige que p_items cubra TODOS los productos ya planificados (si falta alguno, se rechaza) --
-- así la UI siempre tiene que mostrar la lista completa al completar, nada queda "olvidado" en
-- silencio. Rechaza productos repetidos en p_items para no sumar el mismo ajuste de stock dos
-- veces por error.

create or replace function public.completar_produccion(
  p_produccion_id uuid,
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usuario_id uuid := auth.uid();
  v_produccion record;
  v_item record;
  v_producto record;
  v_item_existente record;
  v_stock_nuevo numeric(12, 3);
begin
  if v_usuario_id is null then
    raise exception 'No hay sesión.';
  end if;

  if not public.is_administrador() then
    raise exception 'No autorizado.';
  end if;

  select * into v_produccion from public.producciones where id = p_produccion_id for update;
  if not found then
    raise exception 'La producción % no existe.', p_produccion_id;
  end if;
  if v_produccion.estado <> 'pendiente' then
    raise exception 'Solo se puede completar una producción pendiente (estado actual: %).',
      v_produccion.estado;
  end if;

  if (select count(*) from jsonb_array_elements(p_items))
     <> (select count(distinct x ->> 'producto_id') from jsonb_array_elements(p_items) x) then
    raise exception 'Hay productos repetidos en la confirmación.';
  end if;

  if exists (
    select 1 from public.produccion_items pi
    where pi.produccion_id = p_produccion_id
      and not exists (
        select 1 from jsonb_to_recordset(p_items) as x(producto_id uuid, cantidad_producida numeric)
        where x.producto_id = pi.producto_id
      )
  ) then
    raise exception 'Faltan confirmar cantidades de algún producto planificado.';
  end if;

  for v_item in
    select producto_id, cantidad_producida
    from jsonb_to_recordset(p_items) as x(producto_id uuid, cantidad_producida numeric)
  loop
    if v_item.cantidad_producida is null or v_item.cantidad_producida < 0 then
      raise exception 'La cantidad producida no puede ser negativa.';
    end if;

    select * into v_producto from public.productos where id = v_item.producto_id for update;
    if not found then
      raise exception 'El producto % no existe.', v_item.producto_id;
    end if;
    if not v_producto.controla_stock then
      raise exception '"%" no controla stock: no se puede sumar producción.', v_producto.nombre;
    end if;

    select * into v_item_existente from public.produccion_items
      where produccion_id = p_produccion_id and producto_id = v_item.producto_id;

    if found then
      update public.produccion_items set cantidad_producida = v_item.cantidad_producida
        where id = v_item_existente.id;
    else
      insert into public.produccion_items (produccion_id, producto_id, cantidad_pedida, cantidad_producida)
      values (p_produccion_id, v_item.producto_id, 0, v_item.cantidad_producida);
    end if;

    if v_item.cantidad_producida > 0 then
      v_stock_nuevo := coalesce(v_producto.stock_actual, 0) + v_item.cantidad_producida;
      update public.productos set stock_actual = v_stock_nuevo, updated_at = now()
        where id = v_producto.id;

      insert into public.movimientos_stock (producto_id, tipo, cantidad, stock_resultante, referencia_id, usuario_id)
      values (v_producto.id, 'produccion_propia', v_item.cantidad_producida, v_stock_nuevo, p_produccion_id, v_usuario_id);
    end if;
  end loop;

  update public.producciones
  set estado = 'completado', usuario_completo_id = v_usuario_id, fecha_completado = now()
  where id = p_produccion_id;

  return jsonb_build_object('id', p_produccion_id);
end;
$$;

revoke all on function public.completar_produccion(uuid, jsonb) from public;
grant execute on function public.completar_produccion(uuid, jsonb) to authenticated;

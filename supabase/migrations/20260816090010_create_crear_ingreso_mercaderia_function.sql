-- E15-3: alta atómica de un ingreso de mercadería + sus items (docs/backlog/15-ingreso-mercaderia.md)
--
-- Sin gate de is_administrador() para poder llamarla: cualquier autenticado puede cargar un
-- ingreso (mismo criterio que registrar_merma). La diferencia de rol se resuelve ADENTRO: si
-- quien llama es administrador, el ingreso nace `aprobado` y esta misma función ya ajusta
-- stock_actual + deja el movimiento de auditoría; si es cajero, nace `pendiente_aprobacion` y no
-- toca stock (queda para aprobar_ingreso_mercaderia). Mismo esqueleto de bloqueo de producto
-- (`for update`) que confirmar_venta/registrar_merma para que ingresos/ventas/mermas concurrentes
-- sobre el mismo producto se serialicen.

create or replace function public.crear_ingreso_mercaderia(
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
  v_es_admin boolean;
  v_estado public.estado_ingreso_mercaderia;
  v_ingreso_id uuid;
  v_item record;
  v_producto record;
  v_stock_nuevo numeric(12, 3);
begin
  if v_usuario_id is null then
    raise exception 'No hay sesión.';
  end if;

  if (select count(*) from jsonb_array_elements(p_items)) = 0 then
    raise exception 'El ingreso no tiene productos.';
  end if;

  v_es_admin := public.is_administrador();
  v_estado := case when v_es_admin then 'aprobado' else 'pendiente_aprobacion' end;

  insert into public.ingresos_mercaderia
    (usuario_id, estado, usuario_aprobador_id, fecha_aprobacion, observaciones)
  values (
    v_usuario_id,
    v_estado,
    case when v_es_admin then v_usuario_id else null end,
    case when v_es_admin then now() else null end,
    nullif(trim(coalesce(p_observaciones, '')), '')
  )
  returning id into v_ingreso_id;

  for v_item in
    select producto_id, cantidad
    from jsonb_to_recordset(p_items) as x(producto_id uuid, cantidad numeric)
  loop
    if v_item.cantidad <= 0 then
      raise exception 'La cantidad debe ser mayor a 0.';
    end if;

    select * into v_producto from public.productos where id = v_item.producto_id for update;
    if not found then
      raise exception 'El producto % no existe.', v_item.producto_id;
    end if;
    if not v_producto.controla_stock then
      raise exception '"%" no controla stock: no se puede registrar un ingreso.', v_producto.nombre;
    end if;

    if v_es_admin then
      v_stock_nuevo := coalesce(v_producto.stock_actual, 0) + v_item.cantidad;
      update public.productos set stock_actual = v_stock_nuevo, updated_at = now()
        where id = v_producto.id;

      insert into public.ingreso_mercaderia_items
        (ingreso_mercaderia_id, producto_id, cantidad, stock_previo, stock_resultante)
      values
        (v_ingreso_id, v_producto.id, v_item.cantidad, coalesce(v_producto.stock_actual, 0), v_stock_nuevo);

      insert into public.movimientos_stock
        (producto_id, tipo, cantidad, stock_resultante, referencia_id, usuario_id)
      values
        (v_producto.id, 'ingreso_mercaderia', v_item.cantidad, v_stock_nuevo, v_ingreso_id, v_usuario_id);
    else
      insert into public.ingreso_mercaderia_items
        (ingreso_mercaderia_id, producto_id, cantidad, stock_previo, stock_resultante)
      values
        (v_ingreso_id, v_producto.id, v_item.cantidad, coalesce(v_producto.stock_actual, 0), null);
    end if;
  end loop;

  return jsonb_build_object('id', v_ingreso_id, 'estado', v_estado);
end;
$$;

revoke all on function public.crear_ingreso_mercaderia(jsonb, text) from public;
grant execute on function public.crear_ingreso_mercaderia(jsonb, text) to authenticated;

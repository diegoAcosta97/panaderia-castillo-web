-- E14-3: registrar un consumo interno (personal o dueño) con descuento de stock
-- (docs/backlog/14-mermas-consumo-interno.md)
--
-- Mismo esqueleto y mismo criterio de permisos que registrar_merma (E14-2): sin gate de
-- is_administrador(), cualquier autenticado puede llamarla. `p_empleado_id` es opcional -- permite
-- "consumo del dueño / sin asignar a un empleado puntual" sin forzar un valor artificial -- pero
-- si se pasa, se valida que el empleado exista y esté activo (evita atribuir consumo a alguien
-- que ya no trabaja ahí). `motivo` es obligatorio en los dos casos.

create or replace function public.registrar_consumo_interno(
  p_producto_id uuid,
  p_cantidad numeric,
  p_empleado_id uuid,
  p_motivo text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usuario_id uuid := auth.uid();
  v_producto record;
  v_stock_nuevo numeric(12, 3);
  v_movimiento_id uuid;
begin
  if v_usuario_id is null then
    raise exception 'No hay sesión.';
  end if;

  if p_cantidad <= 0 then
    raise exception 'La cantidad debe ser mayor a cero.';
  end if;

  if trim(coalesce(p_motivo, '')) = '' then
    raise exception 'El motivo es obligatorio.';
  end if;

  if p_empleado_id is not null and not exists (
    select 1 from public.empleados where id = p_empleado_id and activo
  ) then
    raise exception 'El empleado % no existe o está inactivo.', p_empleado_id;
  end if;

  select * into v_producto from public.productos where id = p_producto_id for update;
  if not found then
    raise exception 'El producto % no existe.', p_producto_id;
  end if;

  if not v_producto.controla_stock then
    raise exception '"%" no controla stock: no se puede registrar un consumo interno.',
      v_producto.nombre;
  end if;

  if v_producto.stock_actual < p_cantidad then
    raise exception 'Stock insuficiente para "%": disponible %, consumo %',
      v_producto.nombre, v_producto.stock_actual, p_cantidad;
  end if;

  v_stock_nuevo := v_producto.stock_actual - p_cantidad;
  update public.productos set stock_actual = v_stock_nuevo, updated_at = now()
    where id = v_producto.id;

  insert into public.movimientos_stock
    (producto_id, tipo, cantidad, stock_resultante, usuario_id, empleado_id, motivo)
  values
    (v_producto.id, 'consumo_interno', -p_cantidad, v_stock_nuevo, v_usuario_id, p_empleado_id,
      trim(p_motivo))
  returning id into v_movimiento_id;

  return jsonb_build_object(
    'movimiento_id', v_movimiento_id,
    'stock_resultante', v_stock_nuevo
  );
end;
$$;

revoke all on function public.registrar_consumo_interno(uuid, numeric, uuid, text) from public;
grant execute on function public.registrar_consumo_interno(uuid, numeric, uuid, text) to authenticated;

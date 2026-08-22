-- Mismo bugfix defensivo que 20260822090005_confirmar_venta_null_stock_guard.sql, para
-- registrar_consumo_interno -- mismo esqueleto (bloquea, resta stock_actual, inserta movimiento),
-- mismo riesgo de NULL - cantidad = NULL pisando el NOT NULL de stock_resultante.

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

  if v_producto.stock_actual is null then
    raise exception
      '"%" controla stock pero no tiene stock inicial cargado. Corregilo desde el catálogo de productos antes de registrar un consumo interno.',
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

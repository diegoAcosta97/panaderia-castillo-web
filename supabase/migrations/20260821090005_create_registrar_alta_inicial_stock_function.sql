-- E3-3 cleanup: cierra el hueco de auditoría de crearProducto (repositories/productosRepository.ts)
-- -- hasta acá el stock inicial de un producto nuevo se guardaba en productos.stock_actual sin
-- dejar ningún rastro en movimientos_stock. Se llama justo después del insert del producto, con
-- la cantidad que el propio admin cargó como stock inicial.
--
-- SECURITY DEFINER porque movimientos_stock no tiene policy de insert para `authenticated`
-- (E13-1, ver comentario en 20260806194605_create_movimientos_stock.sql) -- mismo criterio que
-- registrar_merma/registrar_consumo_interno. A diferencia de esas, acá no hay que tocar
-- stock_actual (ya quedó seteado por el insert de productos): solo se valida y se deja el
-- registro. El chequeo `stock_actual = p_cantidad` + "sin movimientos previos" evita que se use
-- para etiquetar como 'alta_inicial' un ajuste posterior sobre un producto que ya tiene historial.

create or replace function public.registrar_alta_inicial_stock(
  p_producto_id uuid,
  p_cantidad numeric
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usuario_id uuid := auth.uid();
  v_producto record;
  v_movimiento_id uuid;
begin
  if v_usuario_id is null then
    raise exception 'No hay sesión.';
  end if;

  if not public.is_administrador() then
    raise exception 'No autorizado.';
  end if;

  if p_cantidad <= 0 then
    raise exception 'La cantidad debe ser mayor a cero.';
  end if;

  select * into v_producto from public.productos where id = p_producto_id for update;
  if not found then
    raise exception 'El producto % no existe.', p_producto_id;
  end if;

  if not v_producto.controla_stock then
    raise exception '"%" no controla stock: no se puede registrar un alta inicial.', v_producto.nombre;
  end if;

  if v_producto.stock_actual is distinct from p_cantidad then
    raise exception 'El stock actual de "%" (%) no coincide con la cantidad de alta inicial (%).',
      v_producto.nombre, v_producto.stock_actual, p_cantidad;
  end if;

  if exists (select 1 from public.movimientos_stock where producto_id = p_producto_id) then
    raise exception '"%" ya tiene movimientos de stock registrados.', v_producto.nombre;
  end if;

  insert into public.movimientos_stock
    (producto_id, tipo, cantidad, stock_resultante, usuario_id)
  values
    (v_producto.id, 'alta_inicial', p_cantidad, v_producto.stock_actual, v_usuario_id)
  returning id into v_movimiento_id;

  return jsonb_build_object('movimiento_id', v_movimiento_id);
end;
$$;

revoke all on function public.registrar_alta_inicial_stock(uuid, numeric) from public;
grant execute on function public.registrar_alta_inicial_stock(uuid, numeric) to authenticated;

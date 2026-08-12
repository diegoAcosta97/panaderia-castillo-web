-- E14-2: registrar una merma (rotura/vencimiento/deterioro) con descuento de stock
-- (docs/backlog/14-mermas-consumo-interno.md)
--
-- Mismo esqueleto que confirmar_venta/generar_lote_etiquetas: bloquea el producto (`for update`)
-- antes de leer stock_actual, para que una merma y una venta (u otra merma) concurrentes sobre el
-- mismo producto se serialicen y no se pisen el stock resultante.
--
-- Sin gate de is_administrador(): la puede llamar cualquier usuario autenticado (cajero o
-- administrador), mismo criterio que crearGasto (E5-2) -- es una operación que ocurre en el
-- momento, en el piso de venta, y exigir aprobación previa desalentaría registrarla al toque. La
-- trazabilidad queda garantizada por `usuario_id` + `motivo` obligatorio, no por una aprobación.

create or replace function public.registrar_merma(
  p_producto_id uuid,
  p_cantidad numeric,
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

  select * into v_producto from public.productos where id = p_producto_id for update;
  if not found then
    raise exception 'El producto % no existe.', p_producto_id;
  end if;

  if not v_producto.controla_stock then
    raise exception '"%" no controla stock: no se puede registrar una merma.', v_producto.nombre;
  end if;

  if v_producto.stock_actual < p_cantidad then
    raise exception 'Stock insuficiente para "%": disponible %, merma %',
      v_producto.nombre, v_producto.stock_actual, p_cantidad;
  end if;

  v_stock_nuevo := v_producto.stock_actual - p_cantidad;
  update public.productos set stock_actual = v_stock_nuevo, updated_at = now()
    where id = v_producto.id;

  insert into public.movimientos_stock
    (producto_id, tipo, cantidad, stock_resultante, usuario_id, motivo)
  values
    (v_producto.id, 'merma', -p_cantidad, v_stock_nuevo, v_usuario_id, trim(p_motivo))
  returning id into v_movimiento_id;

  return jsonb_build_object(
    'movimiento_id', v_movimiento_id,
    'stock_resultante', v_stock_nuevo
  );
end;
$$;

revoke all on function public.registrar_merma(uuid, numeric, text) from public;
grant execute on function public.registrar_merma(uuid, numeric, text) to authenticated;

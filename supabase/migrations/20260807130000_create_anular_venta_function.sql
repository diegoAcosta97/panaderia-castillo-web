-- E7-7: anulación de venta (docs/backlog/07-punto-de-venta.md)
--
-- Solo administrador (chequeado acá adentro, no hay policy de update para `ventas` — ver
-- E7-1). Solo se puede anular una venta `completada` (una `pendiente_pago` nunca descontó
-- stock, no hay nada que revertir; una ya `anulada` no se vuelve a tocar). Revierte stock
-- producto por producto (con el mismo `for update` que confirmar_venta) y deja el
-- `movimientos_stock` de auditoría. Sin reintegro automático de Mercado Pago — decisión
-- registrada en docs/data-model.md.

create or replace function public.anular_venta(p_venta_id uuid, p_motivo text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_venta record;
  v_renglon record;
  v_producto record;
  v_stock_nuevo numeric(12, 3);
begin
  if not public.is_administrador() then
    raise exception 'No autorizado.';
  end if;

  select * into v_venta from public.ventas where id = p_venta_id for update;
  if not found then
    raise exception 'La venta no existe.';
  end if;
  if v_venta.estado <> 'completada' then
    raise exception 'Solo se puede anular una venta completada (estado actual: %).', v_venta.estado;
  end if;

  for v_renglon in
    select producto_id, cantidad from public.renglones_venta where venta_id = p_venta_id
  loop
    select * into v_producto from public.productos where id = v_renglon.producto_id for update;
    if v_producto.controla_stock then
      v_stock_nuevo := v_producto.stock_actual + v_renglon.cantidad;
      update public.productos set stock_actual = v_stock_nuevo, updated_at = now()
        where id = v_producto.id;
      insert into public.movimientos_stock (producto_id, tipo, cantidad, stock_resultante, referencia_id, usuario_id)
      values (v_producto.id, 'anulacion_venta', v_renglon.cantidad, v_stock_nuevo, p_venta_id, auth.uid());
    end if;
  end loop;

  update public.ventas
  set estado = 'anulada',
    anulada_por_id = auth.uid(),
    fecha_anulacion = now(),
    motivo_anulacion = p_motivo
  where id = p_venta_id;
end;
$$;

revoke all on function public.anular_venta(uuid, text) from public;
grant execute on function public.anular_venta(uuid, text) to authenticated;

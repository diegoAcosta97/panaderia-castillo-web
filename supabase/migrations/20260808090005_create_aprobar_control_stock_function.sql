-- E11-3: aprobación de un control de stock, con ajuste de stock (docs/backlog/11-control-stock.md)
--
-- Solo administrador (chequeado acá adentro con is_administrador(), mismo patrón que
-- anular_venta). Por cada detalle con diferencia != 0 bloquea el producto (`for update`, mismo
-- patrón que confirmar_venta/generar_lote_etiquetas para que dos aprobaciones concurrentes -- o
-- una aprobación concurrente con una venta -- no se pisen el stock resultante), fija
-- stock_actual = stock_contado y deja el movimientos_stock de auditoría con
-- tipo = 'ajuste_control_stock'. El ajuste NUNCA es automático al cargar/cerrar el conteo
-- (E11-2): esta función es la única puerta de entrada para tocar stock por un control, y no hay
-- policy de update para `controles_stock` que permita `estado = 'aprobado'` directamente (ver
-- migración anterior) -- solo esta función, que corre con privilegios que bypasean RLS.

create or replace function public.aprobar_control_stock(
  p_control_stock_id uuid,
  p_aprobador_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_control record;
  v_detalle record;
  v_producto record;
begin
  if not public.is_administrador() then
    raise exception 'No autorizado.';
  end if;

  if p_aprobador_id is distinct from auth.uid() then
    raise exception 'p_aprobador_id debe coincidir con el usuario autenticado.';
  end if;

  select * into v_control from public.controles_stock where id = p_control_stock_id for update;
  if not found then
    raise exception 'El control de stock % no existe.', p_control_stock_id;
  end if;
  if v_control.estado <> 'pendiente_aprobacion' then
    raise exception 'Solo se puede aprobar un control pendiente de aprobación (estado actual: %).',
      v_control.estado;
  end if;

  for v_detalle in
    select * from public.control_stock_detalles
    where control_stock_id = p_control_stock_id and diferencia <> 0
  loop
    select * into v_producto from public.productos where id = v_detalle.producto_id for update;

    update public.productos set stock_actual = v_detalle.stock_contado, updated_at = now()
      where id = v_producto.id;

    insert into public.movimientos_stock
      (producto_id, tipo, cantidad, stock_resultante, referencia_id, usuario_id)
    values
      (v_producto.id, 'ajuste_control_stock', v_detalle.diferencia, v_detalle.stock_contado,
        p_control_stock_id, p_aprobador_id);
  end loop;

  update public.controles_stock
  set estado = 'aprobado',
    usuario_aprobador_id = p_aprobador_id,
    fecha_aprobacion = now()
  where id = p_control_stock_id;
end;
$$;

revoke all on function public.aprobar_control_stock(uuid, uuid) from public;
grant execute on function public.aprobar_control_stock(uuid, uuid) to authenticated;

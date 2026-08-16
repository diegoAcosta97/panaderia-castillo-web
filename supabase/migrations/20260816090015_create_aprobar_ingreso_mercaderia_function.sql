-- E15-4: aprobación de un ingreso de mercadería cargado por un cajero (docs/backlog/15-ingreso-mercaderia.md)
--
-- Solo administrador (chequeado acá adentro con is_administrador(), mismo patrón que
-- aprobar_control_stock/anular_venta). Por cada item bloquea el producto (`for update`) y suma
-- `cantidad` al stock_actual VIGENTE al momento de aprobar (no al stock_previo capturado al
-- cargar el ingreso): así una venta o merma ocurrida mientras el ingreso estuvo pendiente no se
-- pierde. Deja movimientos_stock de auditoría con tipo = 'ingreso_mercaderia'. El ajuste NUNCA es
-- automático para un ingreso cargado por cajero -- esta función es la única puerta de entrada
-- para tocar stock por esos ingresos, no hay policy de update que permita `estado = 'aprobado'`
-- directamente (ver migración de E15-2).

create or replace function public.aprobar_ingreso_mercaderia(
  p_ingreso_mercaderia_id uuid,
  p_aprobador_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ingreso record;
  v_item record;
  v_producto record;
  v_stock_nuevo numeric(12, 3);
begin
  if not public.is_administrador() then
    raise exception 'No autorizado.';
  end if;

  if p_aprobador_id is distinct from auth.uid() then
    raise exception 'p_aprobador_id debe coincidir con el usuario autenticado.';
  end if;

  select * into v_ingreso from public.ingresos_mercaderia
    where id = p_ingreso_mercaderia_id for update;
  if not found then
    raise exception 'El ingreso de mercadería % no existe.', p_ingreso_mercaderia_id;
  end if;
  if v_ingreso.estado <> 'pendiente_aprobacion' then
    raise exception 'Solo se puede aprobar un ingreso pendiente de aprobación (estado actual: %).',
      v_ingreso.estado;
  end if;

  for v_item in
    select * from public.ingreso_mercaderia_items where ingreso_mercaderia_id = p_ingreso_mercaderia_id
  loop
    select * into v_producto from public.productos where id = v_item.producto_id for update;

    v_stock_nuevo := coalesce(v_producto.stock_actual, 0) + v_item.cantidad;
    update public.productos set stock_actual = v_stock_nuevo, updated_at = now()
      where id = v_producto.id;

    update public.ingreso_mercaderia_items set stock_resultante = v_stock_nuevo
      where id = v_item.id;

    insert into public.movimientos_stock
      (producto_id, tipo, cantidad, stock_resultante, referencia_id, usuario_id)
    values
      (v_producto.id, 'ingreso_mercaderia', v_item.cantidad, v_stock_nuevo, p_ingreso_mercaderia_id, p_aprobador_id);
  end loop;

  update public.ingresos_mercaderia
  set estado = 'aprobado',
    usuario_aprobador_id = p_aprobador_id,
    fecha_aprobacion = now()
  where id = p_ingreso_mercaderia_id;
end;
$$;

revoke all on function public.aprobar_ingreso_mercaderia(uuid, uuid) from public;
grant execute on function public.aprobar_ingreso_mercaderia(uuid, uuid) to authenticated;

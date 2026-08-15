-- Registra una seña en efectivo para un pedido pendiente, atada al turno de caja abierto en
-- ese momento -- cerrar_turno (próxima migración) la suma al efectivo esperado. Sin gate de
-- admin, mismo criterio que registrar_merma: la cobra quien está atendiendo al cliente.

create or replace function public.registrar_sena_pedido(
  p_pedido_id uuid,
  p_monto numeric
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usuario_id uuid := auth.uid();
  v_turno_id uuid;
  v_pedido public.pedidos_encargo;
  v_sena_id uuid;
begin
  if v_usuario_id is null then
    raise exception 'No hay sesión.';
  end if;

  if p_monto <= 0 then
    raise exception 'El monto debe ser mayor a 0.';
  end if;

  select id into v_turno_id from public.caja_turnos where estado = 'abierta';
  if v_turno_id is null then
    raise exception 'No hay un turno de caja abierto.';
  end if;

  select * into v_pedido from public.pedidos_encargo where id = p_pedido_id for update;
  if not found then
    raise exception 'El pedido no existe.';
  end if;
  if v_pedido.estado <> 'pendiente' then
    raise exception 'El pedido no está pendiente.';
  end if;

  insert into public.senas_pedidos (pedido_id, caja_turno_id, monto, usuario_id)
  values (p_pedido_id, v_turno_id, p_monto, v_usuario_id)
  returning id into v_sena_id;

  return jsonb_build_object('sena_id', v_sena_id, 'caja_turno_id', v_turno_id);
end;
$$;

revoke all on function public.registrar_sena_pedido(uuid, numeric) from public;
grant execute on function public.registrar_sena_pedido(uuid, numeric) to authenticated;

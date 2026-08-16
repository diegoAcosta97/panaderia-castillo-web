-- E4-4: registrar el conteo sorpresivo de bloqueo de caja (docs/backlog/04-caja.md)
--
-- Sin gate de is_administrador(): la registra el cajero que abrió el turno (o un admin, por si
-- cierra en su lugar). Exige contar exactamente la lista vigente de bloqueo_caja_productos --
-- ni un producto de más ni de menos -- y que el turno siga abierto y sin conteo previo. No
-- ajusta stock_actual en absoluto: solo deja el snapshot de sistema vs. contado para que el
-- administrador lo revise (mismo espíritu "a ciegas" que el conteo de control de stock: el
-- cajero no ve acá si lo que cuenta coincide con el sistema).

create or replace function public.registrar_conteo_bloqueo_caja(
  p_turno_id uuid,
  p_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usuario_id uuid := auth.uid();
  v_turno record;
  v_conteo_id uuid;
  v_cantidad_configurados int;
  v_cantidad_enviados int;
begin
  if v_usuario_id is null then
    raise exception 'No hay sesión.';
  end if;

  select * into v_turno from public.caja_turnos where id = p_turno_id for update;
  if not found then
    raise exception 'El turno no existe.';
  end if;
  if v_turno.estado <> 'abierta' then
    raise exception 'El turno ya está cerrado.';
  end if;
  if v_turno.usuario_apertura_id <> v_usuario_id and not public.is_administrador() then
    raise exception 'No autorizado.';
  end if;

  if exists (select 1 from public.bloqueo_caja_conteos where caja_turno_id = p_turno_id) then
    raise exception 'Ya se registró el conteo sorpresivo de este turno.';
  end if;

  select count(*) into v_cantidad_configurados from public.bloqueo_caja_productos;
  if v_cantidad_configurados = 0 then
    raise exception 'No hay productos configurados para el bloqueo de caja.';
  end if;

  select count(*) into v_cantidad_enviados from jsonb_array_elements(p_items);
  if v_cantidad_enviados <> v_cantidad_configurados then
    raise exception 'Hay que contar los % productos configurados para el bloqueo de caja (llegaron %).',
      v_cantidad_configurados, v_cantidad_enviados;
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_items) as x(producto_id uuid, cantidad numeric)
    left join public.bloqueo_caja_productos bcp on bcp.producto_id = x.producto_id
    where bcp.id is null
  ) then
    raise exception 'Se envió un producto que no está configurado para el bloqueo de caja.';
  end if;

  insert into public.bloqueo_caja_conteos (caja_turno_id, usuario_id)
  values (p_turno_id, v_usuario_id)
  returning id into v_conteo_id;

  insert into public.bloqueo_caja_conteo_items
    (bloqueo_caja_conteo_id, producto_id, stock_sistema, stock_contado)
  select v_conteo_id, x.producto_id, coalesce(p.stock_actual, 0), x.cantidad
  from jsonb_to_recordset(p_items) as x(producto_id uuid, cantidad numeric)
  join public.productos p on p.id = x.producto_id;

  return v_conteo_id;
end;
$$;

revoke all on function public.registrar_conteo_bloqueo_caja(uuid, jsonb) from public;
grant execute on function public.registrar_conteo_bloqueo_caja(uuid, jsonb) to authenticated;

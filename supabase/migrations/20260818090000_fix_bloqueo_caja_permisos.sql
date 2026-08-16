-- E4-5: fix de dos bugs reales encontrados al probar bloqueo de caja en uso real
-- (docs/backlog/04-caja.md)
--
-- Bug 1 -- "No autorizado" al registrar el conteo: registrar_conteo_bloqueo_caja exigía que
-- quien cuenta sea quien abrió el turno (o un admin). En la práctica un turno se puede abrir con
-- una sesión y cerrar con otra (cambio de turno, o el dueño abre y el cajero cierra, o
-- viceversa) -- no hay ningún motivo de seguridad real para esa restricción (mismo criterio que
-- registrar_merma/crear_ingreso_mercaderia, sin gate de propietario). Se saca la validación.
--
-- Bug 2 -- el cajero queda en loop infinito entre /pos/caja/cierre y su /conteo: las policies de
-- select de bloqueo_caja_conteos/bloqueo_caja_conteo_items eran admin-only, así que
-- getConteoBloqueoCajaPorTurno (llamado con la sesión del cajero, no con la de un admin) SIEMPRE
-- devolvía null para un cajero -- incluso después de registrar su propio conteo -- y el gate de
-- ambas páginas volvía a mandarlo a contar de nuevo, contra una función que ahora rechaza un
-- segundo conteo para el mismo turno. Se abre el select a cualquier autenticado, mismo criterio
-- que bloqueo_caja_productos (no hay nada sensible en esta tabla que amerite ocultarla).

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

drop policy "bloqueo_caja_conteos_select_admin" on public.bloqueo_caja_conteos;
create policy "bloqueo_caja_conteos_select_authenticated"
  on public.bloqueo_caja_conteos
  for select
  to authenticated
  using (true);

drop policy "bloqueo_caja_conteo_items_select_admin" on public.bloqueo_caja_conteo_items;
create policy "bloqueo_caja_conteo_items_select_authenticated"
  on public.bloqueo_caja_conteo_items
  for select
  to authenticated
  using (true);

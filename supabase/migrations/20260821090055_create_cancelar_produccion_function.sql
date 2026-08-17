-- E16-5: cancelar una producción pendiente (docs/backlog/16-produccion.md) -- solo administrador,
-- y solo mientras sigue pendiente (no toca ningún stock hasta que se completa, así que cancelar
-- una pendiente no tiene nada que revertir). No se puede editar una producción pendiente (decisión
-- del dueño): si se cargó mal, se cancela y se vuelve a cargar.

create or replace function public.cancelar_produccion(p_produccion_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_produccion record;
begin
  if auth.uid() is null then
    raise exception 'No hay sesión.';
  end if;

  if not public.is_administrador() then
    raise exception 'No autorizado.';
  end if;

  select * into v_produccion from public.producciones where id = p_produccion_id for update;
  if not found then
    raise exception 'La producción % no existe.', p_produccion_id;
  end if;
  if v_produccion.estado <> 'pendiente' then
    raise exception 'Solo se puede cancelar una producción pendiente (estado actual: %).',
      v_produccion.estado;
  end if;

  update public.producciones set estado = 'cancelado' where id = p_produccion_id;
end;
$$;

revoke all on function public.cancelar_produccion(uuid) from public;
grant execute on function public.cancelar_produccion(uuid) to authenticated;

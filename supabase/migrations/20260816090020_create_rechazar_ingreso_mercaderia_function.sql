-- E15-4: rechazo de un ingreso de mercadería (docs/backlog/15-ingreso-mercaderia.md)
--
-- No toca stock -- a diferencia de controles_stock (que rechaza con un update directo gated por
-- RLS), acá va también por función porque ingresos_mercaderia no tiene ninguna policy de update
-- para `authenticated` (E15-2, mismo endurecimiento que E13-1 aplicó a movimientos_stock).

create or replace function public.rechazar_ingreso_mercaderia(
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
    raise exception 'Solo se puede rechazar un ingreso pendiente de aprobación (estado actual: %).',
      v_ingreso.estado;
  end if;

  update public.ingresos_mercaderia
  set estado = 'rechazado',
    usuario_aprobador_id = p_aprobador_id,
    fecha_aprobacion = now()
  where id = p_ingreso_mercaderia_id;
end;
$$;

revoke all on function public.rechazar_ingreso_mercaderia(uuid, uuid) from public;
grant execute on function public.rechazar_ingreso_mercaderia(uuid, uuid) to authenticated;

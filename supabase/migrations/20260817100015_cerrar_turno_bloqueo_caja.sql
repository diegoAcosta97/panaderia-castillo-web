-- E4-4: cerrar_turno exige el conteo sorpresivo cuando el bloqueo de caja está activo
-- (docs/backlog/04-caja.md)
--
-- El gate real vive acá (no solo en la UI): si configuracion_negocio.bloqueo_caja_activo está
-- prendido y hay al menos un producto configurado, cerrar_turno revienta si todavía no existe un
-- bloqueo_caja_conteos para este turno -- así no hay forma de cerrar sin contar, ni pegándole
-- directo al RPC. Si no hay ningún producto configurado, el bloqueo no bloquea nada (activarlo
-- sin elegir productos sería un candado sin llave).

create or replace function public.cerrar_turno(
  p_turno_id uuid,
  p_monto_cierre_declarado numeric,
  p_observaciones text
)
returns public.caja_turnos
language plpgsql
security definer
set search_path = public
as $$
declare
  v_turno public.caja_turnos;
  v_ventas_efectivo numeric(12, 2);
  v_gastos_efectivo numeric(12, 2);
  v_pagos_empleados numeric(12, 2);
  v_senas_efectivo numeric(12, 2);
  v_efectivo_esperado numeric(12, 2);
  v_bloqueo_activo boolean;
begin
  if auth.uid() is null then
    raise exception 'No hay sesión.';
  end if;

  select * into v_turno from public.caja_turnos where id = p_turno_id for update;
  if not found then
    raise exception 'El turno no existe.';
  end if;
  if v_turno.estado <> 'abierta' then
    raise exception 'El turno ya está cerrado.';
  end if;

  select coalesce(bloqueo_caja_activo, false) into v_bloqueo_activo
  from public.configuracion_negocio limit 1;

  if v_bloqueo_activo
    and exists (select 1 from public.bloqueo_caja_productos)
    and not exists (select 1 from public.bloqueo_caja_conteos where caja_turno_id = p_turno_id)
  then
    raise exception 'Falta el conteo sorpresivo de bloqueo de caja antes de cerrar el turno.';
  end if;

  select coalesce(sum(vmp.monto), 0) into v_ventas_efectivo
  from public.venta_medios_pago vmp
  join public.ventas v on v.id = vmp.venta_id
  where v.caja_turno_id = p_turno_id
    and vmp.medio_pago = 'efectivo'
    and v.estado = 'completada';

  select coalesce(sum(monto), 0) into v_gastos_efectivo
  from public.gastos
  where caja_turno_id = p_turno_id;

  select coalesce(sum(monto), 0) into v_pagos_empleados
  from public.pagos_empleados
  where caja_turno_id = p_turno_id;

  select coalesce(sum(monto), 0) into v_senas_efectivo
  from public.senas_pedidos
  where caja_turno_id = p_turno_id;

  v_efectivo_esperado := v_turno.monto_apertura + v_ventas_efectivo + v_senas_efectivo
    - v_gastos_efectivo - v_pagos_empleados;

  update public.caja_turnos
  set usuario_cierre_id = auth.uid(),
    monto_cierre_declarado = p_monto_cierre_declarado,
    efectivo_esperado = v_efectivo_esperado,
    diferencia = p_monto_cierre_declarado - v_efectivo_esperado,
    fecha_cierre = now(),
    estado = 'cerrada',
    observaciones = p_observaciones
  where id = p_turno_id
  returning * into v_turno;

  return v_turno;
end;
$$;

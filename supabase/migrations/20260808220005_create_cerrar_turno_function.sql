-- E13-1: cierra un segundo hallazgo de la auditoría de RLS de EPIC 13 -- `caja_turnos_update`
-- (20260806210000_create_caja_turnos.sql) tenía `with check (true)`, sin ninguna restricción
-- sobre los valores nuevos: cualquier cajero con el turno todavía `abierta` podía, por API
-- directa (sin pasar por `calcularEfectivoEsperado`/`cerrarTurno` en features/caja), forjar
-- `monto_cierre_declarado`/`efectivo_esperado`/`diferencia` a cualquier valor -- justo lo que
-- `docs/requisitos-no-funcionales.md` (sección Integridad de datos y auditoría) pide que sea
-- inmutable y confiable. Además, como el `using` deja pasar a un administrador sin importar el
-- `estado`, un turno ya `cerrada` seguía siendo editable para siempre por un admin, contra el
-- mismo requisito ("queda guardado de forma inmutable una vez cerrado el turno").
--
-- Fix: mismo patrón que confirmar_venta/anular_venta/aprobar_control_stock -- una función
-- SECURITY DEFINER es la única puerta para pasar de `abierta` a `cerrada`, calcula
-- efectivo_esperado ella misma (nunca confía en un valor mandado por el cliente) y se elimina
-- la policy de update por completo: no queda ningún camino de escritura directa para
-- caja_turnos una vez creado (ni para cerrar, ni para editar un turno ya cerrado).
--
-- De paso corrige un bug funcional preexistente descubierto durante esta auditoría:
-- `features/caja/services/arqueoService.ts#calcularEfectivoEsperado` tenía `ventasEfectivo`
-- hardcodeado en 0 desde EPIC 4 con un TODO("completar cuando exista venta_medios_pago") que
-- nunca se completó después de EPIC 7 -- todo turno cerrado hasta ahora calculó su
-- `efectivo_esperado`/`diferencia` sin contar ni un peso de las ventas en efectivo del turno.
-- Esta función sí lo suma. Solo cuenta ventas con estado = 'completada' (no pendiente_pago ni
-- anulada): una venta combinada (efectivo + Mercado Pago) que se cancela antes de acreditarse
-- (cancelar_venta_pendiente) dejó su porción en efectivo con estado_pago = 'acreditado' pero la
-- venta entera pasa a `anulada` sin revertir ese medio (limitación conocida y preexistente de
-- esa función, fuera del alcance de este fix) -- contarla igual haría que el efectivo esperado
-- ignorara una posible salida real de caja para esa venta puntual; no contarla es la opción más
-- conservadora (en el peor caso, señala una diferencia a favor de la caja, nunca la esconde).

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
  v_efectivo_esperado numeric(12, 2);
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

  select coalesce(sum(vmp.monto), 0) into v_ventas_efectivo
  from public.venta_medios_pago vmp
  join public.ventas v on v.id = vmp.venta_id
  where v.caja_turno_id = p_turno_id
    and vmp.medio_pago = 'efectivo'
    and v.estado = 'completada';

  select coalesce(sum(monto), 0) into v_gastos_efectivo
  from public.gastos
  where caja_turno_id = p_turno_id;

  v_efectivo_esperado := v_turno.monto_apertura + v_ventas_efectivo - v_gastos_efectivo;

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

revoke all on function public.cerrar_turno(uuid, numeric, text) from public;
grant execute on function public.cerrar_turno(uuid, numeric, text) to authenticated;

drop policy "caja_turnos_update" on public.caja_turnos;

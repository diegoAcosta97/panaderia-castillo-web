-- Migración a QR estático de Mercado Pago (docs/backlog/08-mercadopago.md#E8-2)
--
-- Con QR dinámico había que mostrarle un QR distinto al cliente en cada venta (girando el
-- monitor). Con QR estático el QR es fijo por caja (se imprime una sola vez, RF-7.1) y cada
-- venta solo cambia el monto "vigente" en esa caja del lado de la API de Mercado Pago -- el
-- cliente escanea siempre el mismo cartel. Esto trae dos consecuencias nuevas que no existían
-- con dinámico:
--
-- 1) Solo puede haber UNA orden de Mercado Pago pendiente por vez en la caja física (si se
--    crea una segunda antes de que la primera se pague, la primera queda huérfana -- el QR fijo
--    ya no la referencia). Con una sola caja (decisión explícita por ahora, se revisa cuando
--    haya que soportar más de una en paralelo) alcanza con bloquear la generación de un QR
--    nuevo mientras haya otro pendiente en cualquier caja -- `hay_pago_mp_pendiente()`.
-- 2) Hace falta poder cancelar una venta `pendiente_pago` que el cajero abandona (el cliente no
--    llegó a pagar) para liberar ese lugar -- antes no hacía falta: el QR dinámico simplemente
--    dejaba de mostrarse. `cancelar_venta_pendiente()` no requiere admin (a diferencia de
--    `anular_venta`, E7-7): no se descontó stock ni se cobró nada todavía, es solo destrabar la
--    caja para la próxima venta.

alter table public.venta_medios_pago add column mp_orden_id text;

drop function if exists public.registrar_qr_pago(uuid, text, text);

create or replace function public.registrar_qr_pago(
  p_venta_medio_pago_id uuid,
  p_mp_referencia_externa text,
  p_mp_payment_id text,
  p_mp_orden_id text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'No hay sesión.';
  end if;

  update public.venta_medios_pago
  set mp_referencia_externa = p_mp_referencia_externa,
    mp_payment_id = p_mp_payment_id,
    mp_orden_id = p_mp_orden_id
  where id = p_venta_medio_pago_id
    and medio_pago = 'mercado_pago'
    and estado_pago = 'pendiente';
end;
$$;

revoke all on function public.registrar_qr_pago(uuid, text, text, text) from public;
grant execute on function public.registrar_qr_pago(uuid, text, text, text) to authenticated;

-- Chequeo previo a crear una orden nueva: con una sola caja física, dos órdenes "vigentes" al
-- mismo tiempo pisarían el mismo QR fijo. Boolean nomás (no expone qué venta es) para poder
-- otorgárselo a cualquier cajero sin filtrar datos de otras ventas/turnos.
create or replace function public.hay_pago_mp_pendiente()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.venta_medios_pago vmp
    join public.ventas v on v.id = vmp.venta_id
    where vmp.medio_pago = 'mercado_pago'
      and vmp.estado_pago = 'pendiente'
      and v.estado = 'pendiente_pago'
  );
$$;

revoke all on function public.hay_pago_mp_pendiente() from public;
grant execute on function public.hay_pago_mp_pendiente() to authenticated;

-- Cancelación de una venta pendiente_pago abandonada por el cajero (RF-7.3). Sin chequeo de
-- administrador a propósito: a diferencia de anular_venta (E7-7), acá no hay stock descontado
-- ni dinero cobrado que revertir -- es simplemente liberar la caja para la próxima venta.
-- Devuelve el mp_orden_id (si ya se había generado un QR) para que quien la llame pueda además
-- cancelar la orden del lado de Mercado Pago.
create or replace function public.cancelar_venta_pendiente(p_venta_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_venta record;
  v_mp_orden_id text;
begin
  if auth.uid() is null then
    raise exception 'No hay sesión.';
  end if;

  select * into v_venta from public.ventas where id = p_venta_id for update;
  if not found then
    raise exception 'La venta no existe.';
  end if;
  if v_venta.estado <> 'pendiente_pago' then
    raise exception 'Solo se puede cancelar una venta pendiente de pago (estado actual: %).', v_venta.estado;
  end if;

  select mp_orden_id into v_mp_orden_id
  from public.venta_medios_pago
  where venta_id = p_venta_id and medio_pago = 'mercado_pago'
  limit 1;

  update public.venta_medios_pago
  set estado_pago = 'rechazado'
  where venta_id = p_venta_id and medio_pago = 'mercado_pago' and estado_pago = 'pendiente';

  update public.ventas
  set estado = 'anulada',
    anulada_por_id = auth.uid(),
    fecha_anulacion = now(),
    motivo_anulacion = 'Cancelada por el cajero antes de acreditarse el pago.'
  where id = p_venta_id;

  return jsonb_build_object('mp_orden_id', v_mp_orden_id);
end;
$$;

revoke all on function public.cancelar_venta_pendiente(uuid) from public;
grant execute on function public.cancelar_venta_pendiente(uuid) to authenticated;

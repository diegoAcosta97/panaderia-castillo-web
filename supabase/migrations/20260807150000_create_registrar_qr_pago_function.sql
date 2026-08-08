-- E8-2: guarda la referencia de la orden de Mercado Pago en el medio de pago pendiente de la
-- venta (docs/backlog/08-mercadopago.md). Mismo criterio que confirmar_venta/anular_venta:
-- venta_medios_pago no tiene policy de update para `authenticated` (E7-2), así que esto también
-- pasa por una función SECURITY DEFINER. Solo toca filas 'mercado_pago' todavía 'pendiente' --
-- no tiene sentido (ni debería poder) reescribir la referencia de un pago ya acreditado/rechazado.

create or replace function public.registrar_qr_pago(
  p_venta_medio_pago_id uuid,
  p_mp_referencia_externa text,
  p_mp_payment_id text
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
    mp_payment_id = p_mp_payment_id
  where id = p_venta_medio_pago_id
    and medio_pago = 'mercado_pago'
    and estado_pago = 'pendiente';
end;
$$;

revoke all on function public.registrar_qr_pago(uuid, text, text) from public;
grant execute on function public.registrar_qr_pago(uuid, text, text) to authenticated;

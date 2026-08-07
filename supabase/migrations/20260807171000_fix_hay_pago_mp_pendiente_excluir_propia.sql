-- Corrige un bug propio detectado al verificar la migración a QR estático (E8-2, 2026-08-07):
-- hay_pago_mp_pendiente() se llama DESPUÉS de que confirmar_venta ya insertó el
-- venta_medios_pago 'pendiente' de la propia venta que se está por cobrar -- sin excluirla, el
-- chequeo se veía a sí mismo y bloqueaba siempre, en la primera venta con Mercado Pago del día.

drop function if exists public.hay_pago_mp_pendiente();

create or replace function public.hay_pago_mp_pendiente(p_excluir_venta_id uuid)
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
      and v.id <> p_excluir_venta_id
  );
$$;

revoke all on function public.hay_pago_mp_pendiente(uuid) from public;
grant execute on function public.hay_pago_mp_pendiente(uuid) to authenticated;

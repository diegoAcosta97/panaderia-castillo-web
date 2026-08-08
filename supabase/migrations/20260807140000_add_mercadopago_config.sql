-- E8-1: identificadores de sucursal/caja de Mercado Pago para generar QR
-- (docs/backlog/08-mercadopago.md). Se completan una sola vez con un script de setup
-- (scripts/mercadopago/setupStoreAndPos.ts), no desde la UI.

alter table public.configuracion_negocio
  add column mercadopago_store_id text,
  add column mercadopago_external_pos_id text;

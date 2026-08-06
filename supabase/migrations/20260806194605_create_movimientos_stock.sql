-- E3-3: histórico de movimientos de stock (docs/backlog/03-productos.md)
--
-- Nada escribe acá todavía: la primera escritura real llega con las funciones
-- SECURITY DEFINER de ventas (EPIC 7), etiquetas (EPIC 10) y control de stock (EPIC 11). Por
-- eso no hay policy de insert/update para `authenticated` — esas funciones corren con los
-- privilegios de su dueño (igual que handle_new_user en 00-fundamentos.md#E0-4), no necesitan
-- una policy explícita para escribir. Solo lectura para administrador (auditoría).

create type public.tipo_movimiento_stock as enum (
  'venta',
  'anulacion_venta',
  'etiqueta_generada',
  'ajuste_control_stock',
  'ajuste_manual',
  'alta_inicial'
);

create table public.movimientos_stock (
  id uuid primary key default gen_random_uuid(),
  producto_id uuid not null references public.productos (id),
  tipo public.tipo_movimiento_stock not null,
  cantidad numeric(12, 3) not null,
  stock_resultante numeric(12, 3) not null,
  referencia_id uuid,
  usuario_id uuid not null references public.perfiles (id),
  fecha timestamptz not null default now()
);

create index movimientos_stock_producto_id_idx on public.movimientos_stock (producto_id);

alter table public.movimientos_stock enable row level security;

create policy "movimientos_stock_select_admin"
  on public.movimientos_stock
  for select
  to authenticated
  using (public.is_administrador());

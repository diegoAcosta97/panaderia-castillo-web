-- E4-4: esquema de bloqueo de caja (docs/backlog/04-caja.md)
--
-- `bloqueo_caja_productos`: la lista de hasta 10 productos que el administrador eligió para el
-- control sorpresivo -- puede ir cambiando quiénes están en la lista en cualquier momento
-- (RF: "esos articulos los pueda ir cambiando"). Lectura abierta a cualquier autenticado (el
-- cajero necesita ver qué le toca contar); escritura solo admin. El límite de 10 se hace cumplir
-- en el propio `with check` del insert, no solo en la UI.
--
-- `bloqueo_caja_conteos`/`bloqueo_caja_conteo_items`: el conteo sorpresivo que el cajero hace
-- antes de cerrar su turno -- mismo esqueleto que controles_stock/control_stock_detalles, pero
-- deliberadamente sin ningún flujo de aprobación (esto no ajusta stock, es un registro de
-- auditoría para que el administrador compare el sistema contra lo contado y detecte
-- diferencias; RF: "control sorpresivo"). `caja_turno_id` es unique: como mucho un conteo por
-- turno. Sin ninguna policy de insert/update para `authenticated` -- la única puerta es
-- registrar_conteo_bloqueo_caja (SECURITY DEFINER, migración siguiente), que además es lo que
-- valida que se contó exactamente la lista configurada, ni más ni menos.

create table public.bloqueo_caja_productos (
  id uuid primary key default gen_random_uuid(),
  producto_id uuid not null references public.productos (id),
  created_at timestamptz not null default now(),
  unique (producto_id)
);

create table public.bloqueo_caja_conteos (
  id uuid primary key default gen_random_uuid(),
  caja_turno_id uuid not null references public.caja_turnos (id),
  usuario_id uuid not null references public.perfiles (id),
  fecha timestamptz not null default now(),
  unique (caja_turno_id)
);

create table public.bloqueo_caja_conteo_items (
  id uuid primary key default gen_random_uuid(),
  bloqueo_caja_conteo_id uuid not null references public.bloqueo_caja_conteos (id),
  producto_id uuid not null references public.productos (id),
  stock_sistema numeric(12, 3) not null,
  stock_contado numeric(12, 3) not null,
  diferencia numeric(12, 3) generated always as (stock_contado - stock_sistema) stored
);

create index bloqueo_caja_conteo_items_conteo_id_idx
  on public.bloqueo_caja_conteo_items (bloqueo_caja_conteo_id);

alter table public.bloqueo_caja_productos enable row level security;
alter table public.bloqueo_caja_conteos enable row level security;
alter table public.bloqueo_caja_conteo_items enable row level security;

create policy "bloqueo_caja_productos_select_authenticated"
  on public.bloqueo_caja_productos
  for select
  to authenticated
  using (true);

create policy "bloqueo_caja_productos_insert_admin"
  on public.bloqueo_caja_productos
  for insert
  to authenticated
  with check (
    public.is_administrador()
    and (select count(*) from public.bloqueo_caja_productos) < 10
  );

create policy "bloqueo_caja_productos_delete_admin"
  on public.bloqueo_caja_productos
  for delete
  to authenticated
  using (public.is_administrador());

create policy "bloqueo_caja_conteos_select_admin"
  on public.bloqueo_caja_conteos
  for select
  to authenticated
  using (public.is_administrador());

create policy "bloqueo_caja_conteo_items_select_admin"
  on public.bloqueo_caja_conteo_items
  for select
  to authenticated
  using (public.is_administrador());

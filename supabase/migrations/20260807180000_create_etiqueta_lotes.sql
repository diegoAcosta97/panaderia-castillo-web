-- E10-1: lotes de etiquetas generadas (docs/backlog/10-etiquetas.md)
--
-- Lectura abierta a cualquier autenticado, mismo criterio que productos/movimientos_stock (sin
-- dato sensible). Escritura solo vía generar_lote_etiquetas (E10-2, SECURITY DEFINER) -- sin
-- policy de insert/update para authenticated.

create table public.etiqueta_lotes (
  id uuid primary key default gen_random_uuid(),
  producto_id uuid not null references public.productos (id),
  cantidad int not null check (cantidad > 0),
  fecha_vencimiento date,
  precio_impreso numeric(12, 2) not null,
  usuario_id uuid not null references public.perfiles (id),
  fecha_generacion timestamptz not null default now()
);

create index etiqueta_lotes_producto_id_idx on public.etiqueta_lotes (producto_id);

alter table public.etiqueta_lotes enable row level security;

create policy "etiqueta_lotes_select_authenticated"
  on public.etiqueta_lotes
  for select
  to authenticated
  using (true);

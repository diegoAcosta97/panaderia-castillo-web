-- E3-1: categorías de producto (docs/backlog/03-productos.md)
--
-- Lectura abierta a cualquier usuario autenticado (cajero y administrador la necesitan: el
-- cajero para navegar el catálogo en el punto de venta). Escritura solo administrador, vía
-- is_administrador() (docs/backlog/02-roles.md#E2-4).

create table public.categorias (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  activo boolean not null default true
);

alter table public.categorias enable row level security;

create policy "categorias_select_authenticated"
  on public.categorias
  for select
  to authenticated
  using (true);

create policy "categorias_insert_admin"
  on public.categorias
  for insert
  to authenticated
  with check (public.is_administrador());

create policy "categorias_update_admin"
  on public.categorias
  for update
  to authenticated
  using (public.is_administrador())
  with check (public.is_administrador());

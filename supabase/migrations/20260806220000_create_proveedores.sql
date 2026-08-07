-- E5-1: catálogo de proveedores (docs/backlog/05-proveedores-gastos.md)
--
-- Lectura abierta a cualquier autenticado (el cajero elige un proveedor al cargar un gasto).
-- Escritura solo administrador.

create table public.proveedores (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  cuit text,
  telefono text,
  email text,
  direccion text,
  activo boolean not null default true
);

alter table public.proveedores enable row level security;

create policy "proveedores_select_authenticated"
  on public.proveedores
  for select
  to authenticated
  using (true);

create policy "proveedores_insert_admin"
  on public.proveedores
  for insert
  to authenticated
  with check (public.is_administrador());

create policy "proveedores_update_admin"
  on public.proveedores
  for update
  to authenticated
  using (public.is_administrador())
  with check (public.is_administrador());

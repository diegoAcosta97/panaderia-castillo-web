-- Empleados: entidad nueva para la gestión de pagos a empleados. Un empleado cobra por día o
-- por quincena (tipo_cobro), dato que se carga a mano por el administrador -- no existe en el
-- sistema legado.
--
-- Lectura abierta a cualquier usuario autenticado (se necesita para elegir a quién pagar desde
-- el form de carga, aunque solo el admin pueda cargar el pago -- mismo criterio que
-- productos_select_authenticated). Escritura solo administrador.

create type public.tipo_cobro_empleado as enum ('por_dia', 'quincena');

create table public.empleados (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  tipo_cobro public.tipo_cobro_empleado not null,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.empleados enable row level security;

create policy "empleados_select_authenticated"
  on public.empleados
  for select
  to authenticated
  using (true);

create policy "empleados_insert_admin"
  on public.empleados
  for insert
  to authenticated
  with check (public.is_administrador());

create policy "empleados_update_admin"
  on public.empleados
  for update
  to authenticated
  using (public.is_administrador())
  with check (public.is_administrador());

-- E0-6: datos del comercio, usados en comprobantes y etiquetas (docs/backlog/00-fundamentos.md)
--
-- Fila única (sin PK natural más allá del uuid — se garantiza "una sola fila" a nivel de
-- aplicación, no con un constraint, para no complicar la migración por algo que no va a
-- cambiar). Lectura abierta a cualquier usuario autenticado (la necesitan tanto el punto de
-- venta como la impresión de etiquetas, sin importar el rol). La política de escritura
-- (solo administrador) se agrega en docs/backlog/12-configuracion.md#E12-1, junto con la
-- pantalla que la usa — no hace falta antes porque hasta entonces solo se edita con la secret
-- key.

create table public.configuracion_negocio (
  id uuid primary key default gen_random_uuid(),
  nombre_comercial text not null,
  direccion text,
  telefono text,
  cuit text,
  updated_at timestamptz not null default now()
);

alter table public.configuracion_negocio enable row level security;

create policy "configuracion_negocio_select_authenticated"
  on public.configuracion_negocio
  for select
  to authenticated
  using (true);

insert into public.configuracion_negocio (nombre_comercial)
values ('Panadería Castillo');

-- E6-2: descuentos condicionales sobre el total de la venta — docs/backlog/06-ofertas-descuentos.md
--
-- El check constraint fuerza que cada condición tenga cargado exactamente el campo que le
-- corresponde según tipo_condicion (defensa a nivel de base, además de la validación del
-- formulario). Mismo criterio de RLS que ofertas.

create type public.tipo_efecto_descuento as enum ('porcentaje', 'monto_fijo');

create type public.tipo_condicion_descuento as enum (
  'monto_minimo',
  'producto_incluido',
  'categoria_incluida'
);

create table public.descuentos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  descripcion text,
  tipo_efecto public.tipo_efecto_descuento not null,
  valor_efecto numeric(12, 2) not null check (valor_efecto >= 0),
  fecha_inicio date,
  fecha_fin date,
  activo boolean not null default true
);

create table public.descuento_condiciones (
  id uuid primary key default gen_random_uuid(),
  descuento_id uuid not null references public.descuentos (id) on delete cascade,
  tipo_condicion public.tipo_condicion_descuento not null,
  monto_minimo numeric(12, 2),
  producto_id uuid references public.productos (id),
  categoria_id uuid references public.categorias (id),
  cantidad_minima numeric(12, 3),
  constraint descuento_condicion_campo_correspondiente check (
    (tipo_condicion = 'monto_minimo'
      and monto_minimo is not null and producto_id is null and categoria_id is null)
    or (tipo_condicion = 'producto_incluido'
      and producto_id is not null and monto_minimo is null and categoria_id is null)
    or (tipo_condicion = 'categoria_incluida'
      and categoria_id is not null and monto_minimo is null and producto_id is null)
  )
);

create index descuento_condiciones_descuento_id_idx on public.descuento_condiciones (descuento_id);

alter table public.descuentos enable row level security;
alter table public.descuento_condiciones enable row level security;

create policy "descuentos_select_authenticated"
  on public.descuentos for select to authenticated using (true);
create policy "descuentos_insert_admin"
  on public.descuentos for insert to authenticated with check (public.is_administrador());
create policy "descuentos_update_admin"
  on public.descuentos for update to authenticated
  using (public.is_administrador()) with check (public.is_administrador());

create policy "descuento_condiciones_select_authenticated"
  on public.descuento_condiciones for select to authenticated using (true);
create policy "descuento_condiciones_insert_admin"
  on public.descuento_condiciones for insert to authenticated with check (public.is_administrador());
create policy "descuento_condiciones_delete_admin"
  on public.descuento_condiciones for delete to authenticated using (public.is_administrador());

-- E6-1: ofertas (combos de 2+ productos) — docs/backlog/06-ofertas-descuentos.md
--
-- El mínimo de 2 productos por oferta (RF-2.1) se valida en la capa de servicio
-- (repositories/ofertasRepository.ts), no acá: un check constraint no puede contar filas de
-- otra tabla. Lectura abierta a cualquier autenticado (el motor de evaluación de EPIC 7 corre
-- del lado del cajero). Escritura solo administrador.

create type public.tipo_beneficio_oferta as enum (
  'precio_fijo',
  'descuento_porcentaje',
  'descuento_monto'
);

create table public.ofertas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  descripcion text,
  tipo_beneficio public.tipo_beneficio_oferta not null,
  valor_beneficio numeric(12, 2) not null check (valor_beneficio >= 0),
  max_aplicaciones_por_venta int check (max_aplicaciones_por_venta > 0),
  fecha_inicio date,
  fecha_fin date,
  activo boolean not null default true
);

create table public.oferta_items (
  id uuid primary key default gen_random_uuid(),
  oferta_id uuid not null references public.ofertas (id) on delete cascade,
  producto_id uuid not null references public.productos (id),
  cantidad_requerida numeric(12, 3) not null check (cantidad_requerida > 0)
);

create index oferta_items_oferta_id_idx on public.oferta_items (oferta_id);

alter table public.ofertas enable row level security;
alter table public.oferta_items enable row level security;

create policy "ofertas_select_authenticated"
  on public.ofertas for select to authenticated using (true);
create policy "ofertas_insert_admin"
  on public.ofertas for insert to authenticated with check (public.is_administrador());
create policy "ofertas_update_admin"
  on public.ofertas for update to authenticated
  using (public.is_administrador()) with check (public.is_administrador());

create policy "oferta_items_select_authenticated"
  on public.oferta_items for select to authenticated using (true);
create policy "oferta_items_insert_admin"
  on public.oferta_items for insert to authenticated with check (public.is_administrador());
create policy "oferta_items_delete_admin"
  on public.oferta_items for delete to authenticated using (public.is_administrador());

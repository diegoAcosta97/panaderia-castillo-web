-- E3-2: catálogo de productos (docs/backlog/03-productos.md)
--
-- tipo_venta es fijo por producto (RF-1.2): nunca se vende por unidad y por peso a la vez. El
-- check de stock_actual entero cuando tipo_venta = 'unidad' evita cargar, por error, "3.5
-- unidades" de un producto que no se vende por peso.
--
-- Lectura abierta a cualquier usuario autenticado (venta, etiquetas, etc. en epics futuras).
-- Escritura solo administrador.

create type public.tipo_venta_producto as enum ('unidad', 'peso');

create table public.productos (
  id uuid primary key default gen_random_uuid(),
  categoria_id uuid not null references public.categorias (id),
  nombre text not null,
  codigo_barras text not null unique,
  tipo_venta public.tipo_venta_producto not null,
  precio numeric(12, 2) not null check (precio >= 0),
  controla_stock boolean not null default true,
  stock_actual numeric(12, 3),
  stock_minimo numeric(12, 3),
  dias_vencimiento_default int,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint stock_actual_entero_si_unidad check (
    tipo_venta <> 'unidad' or stock_actual is null or stock_actual = floor(stock_actual)
  )
);

-- Sin índice aparte: el `unique` de arriba ya crea uno (btree sobre codigo_barras), suficiente
-- para la búsqueda exacta de E3-7.

alter table public.productos enable row level security;

create policy "productos_select_authenticated"
  on public.productos
  for select
  to authenticated
  using (true);

create policy "productos_insert_admin"
  on public.productos
  for insert
  to authenticated
  with check (public.is_administrador());

create policy "productos_update_admin"
  on public.productos
  for update
  to authenticated
  using (public.is_administrador())
  with check (public.is_administrador());

-- E11-1: esquema de control periódico de stock (docs/backlog/11-control-stock.md)
--
-- Funcionalidad enteramente admin (las 3 rutas viven bajo /admin/control-stock/**): a
-- diferencia de productos/etiqueta_lotes, acá ni siquiera el select se abre a cualquier
-- autenticado -- mismo criterio que movimientos_stock_select_admin.
--
-- Escritura: iniciar un conteo + cargar sus detalles (E11-2) y rechazarlo (E11-4) son updates de
-- una sola fila (o un insert simple) sin invariante multi-fila que proteger, así que van
-- directo vía policies gated por is_administrador() -- ver nota de E11-4 en el backlog. Aprobar
-- (E11-3) sí tiene un invariante multi-fila (ajustar stock de N productos + insertar N
-- movimientos_stock + cerrar el control, todo o nada), por eso pasa exclusivamente por la
-- función aprobar_control_stock (SECURITY DEFINER, migración siguiente) y el `with check` de acá
-- abajo bloquea explícitamente que un cliente marque `estado = 'aprobado'` con un update directo.

create type public.estado_control_stock as enum (
  'en_progreso',
  'pendiente_aprobacion',
  'aprobado',
  'rechazado'
);

create table public.controles_stock (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.perfiles (id),
  estado public.estado_control_stock not null default 'en_progreso',
  usuario_aprobador_id uuid references public.perfiles (id),
  fecha_inicio timestamptz not null default now(),
  fecha_cierre timestamptz,
  fecha_aprobacion timestamptz,
  observaciones text
);

create table public.control_stock_detalles (
  id uuid primary key default gen_random_uuid(),
  control_stock_id uuid not null references public.controles_stock (id),
  producto_id uuid not null references public.productos (id),
  stock_sistema numeric(12, 3) not null,
  stock_contado numeric(12, 3) not null,
  diferencia numeric(12, 3) generated always as (stock_contado - stock_sistema) stored
);

create index control_stock_detalles_control_stock_id_idx
  on public.control_stock_detalles (control_stock_id);
create index control_stock_detalles_producto_id_idx
  on public.control_stock_detalles (producto_id);

alter table public.controles_stock enable row level security;
alter table public.control_stock_detalles enable row level security;

create policy "controles_stock_select_admin"
  on public.controles_stock
  for select
  to authenticated
  using (public.is_administrador());

-- Insert: solo para iniciar un conteo propio (E11-2), siempre arranca en_progreso -- el resto
-- de las transiciones de estado pasan por update.
create policy "controles_stock_insert_admin"
  on public.controles_stock
  for insert
  to authenticated
  with check (
    public.is_administrador()
    and usuario_id = auth.uid()
    and estado = 'en_progreso'
  );

-- Update: cubre dos transiciones que hace el cliente directamente --
--   en_progreso -> pendiente_aprobacion (E11-2, al finalizar la carga de un conteo)
--   pendiente_aprobacion -> rechazado (E11-4, al rechazar)
-- `aprobado` queda deliberadamente afuera del `with check`: la única forma de llegar a ese
-- estado es la función aprobar_control_stock (SECURITY DEFINER, corre con privilegios que
-- bypasean RLS -- mismo patrón que confirmar_venta/anular_venta). El `using` tampoco deja tocar
-- una fila ya resuelta (aprobado/rechazado).
create policy "controles_stock_update_admin"
  on public.controles_stock
  for update
  to authenticated
  using (public.is_administrador() and estado in ('en_progreso', 'pendiente_aprobacion'))
  with check (public.is_administrador() and estado in ('pendiente_aprobacion', 'rechazado'));

create policy "control_stock_detalles_select_admin"
  on public.control_stock_detalles
  for select
  to authenticated
  using (public.is_administrador());

-- Insert: solo detalles de productos que controlan stock, y solo mientras el control padre
-- sigue en_progreso (E11-2 los inserta todos juntos al finalizar la carga, justo antes de cerrar
-- el control con el update de arriba).
create policy "control_stock_detalles_insert_admin"
  on public.control_stock_detalles
  for insert
  to authenticated
  with check (
    public.is_administrador()
    and exists (
      select 1 from public.controles_stock c
      where c.id = control_stock_id and c.estado = 'en_progreso'
    )
    and exists (
      select 1 from public.productos p
      where p.id = producto_id and p.controla_stock
    )
  );

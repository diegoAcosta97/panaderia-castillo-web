-- E16-2: esquema de producción propia (docs/backlog/16-produccion.md) -- funcionalidad
-- enteramente admin (todo el flujo, desde cargar el pedido de producción hasta confirmarlo, pasa
-- por /admin), mismo criterio de RLS que controles_stock/movimientos_stock_select_admin: ni
-- siquiera el select se abre a cualquier autenticado.
--
-- Sin policies de insert/update/delete para `authenticated`: mismo endurecimiento que
-- ingresos_mercaderia (E15-2) -- las tres transiciones (crear, completar, cancelar) pasan
-- exclusivamente por funciones SECURITY DEFINER (migraciones siguientes). A diferencia de
-- ingreso_mercaderia (que puede cargar un cajero y queda pendiente_aprobacion), acá el dueño
-- pidió explícitamente que todo el flujo sea solo admin, así que no hace falta distinguir "quien
-- carga" de "quien aprueba" -- el mismo admin hace las dos cosas, en dos pasos separados en el
-- tiempo (pendiente -> completado).
--
-- `produccion_items.cantidad_pedida` es lo planificado al cargar la producción; `cantidad_
-- producida` queda null hasta que se completa, momento en el que se "ratifica" (RF del dueño: ver
-- si hubo faltantes o se hizo de más). Un producto agregado recién al completar (no estaba en la
-- lista original) se inserta con cantidad_pedida = 0. `diferencia` es una columna generada, mismo
-- patrón que control_stock_detalles (E11-1).

create type public.estado_produccion as enum ('pendiente', 'completado', 'cancelado');

create table public.producciones (
  id uuid primary key default gen_random_uuid(),
  empleado_id uuid not null references public.empleados (id),
  usuario_id uuid not null references public.perfiles (id),
  fecha_pedido date not null,
  fecha_entrega date not null,
  estado public.estado_produccion not null default 'pendiente',
  usuario_completo_id uuid references public.perfiles (id),
  fecha_completado timestamptz,
  observaciones text,
  created_at timestamptz not null default now()
);

create table public.produccion_items (
  id uuid primary key default gen_random_uuid(),
  produccion_id uuid not null references public.producciones (id),
  producto_id uuid not null references public.productos (id),
  cantidad_pedida numeric(12, 3) not null default 0 check (cantidad_pedida >= 0),
  cantidad_producida numeric(12, 3) check (cantidad_producida >= 0),
  diferencia numeric(12, 3) generated always as (cantidad_producida - cantidad_pedida) stored
);

create index producciones_estado_idx on public.producciones (estado);
create index produccion_items_produccion_id_idx on public.produccion_items (produccion_id);
create index produccion_items_producto_id_idx on public.produccion_items (producto_id);

alter table public.producciones enable row level security;
alter table public.produccion_items enable row level security;

create policy "producciones_select_admin"
  on public.producciones
  for select
  to authenticated
  using (public.is_administrador());

create policy "produccion_items_select_admin"
  on public.produccion_items
  for select
  to authenticated
  using (public.is_administrador());

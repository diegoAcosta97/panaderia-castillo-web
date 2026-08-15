-- Pedidos por encargo: reserva de productos del catálogo existente para entregar en una fecha,
-- con seña opcional. Lo puede cargar cajero o admin (mismo criterio que gastos, RF-6.2). No se
-- guarda precio/total en el pedido ni en sus items: el total se calcula al vuelo uniendo con
-- productos.precio vigente (el día de entrega se despacha como una venta normal, al precio del
-- día -- el "total" que se muestra al crear/listar el pedido es solo una referencia).
--
-- Toda la escritura (alta con items, señas) pasa por funciones SECURITY DEFINER (próximas
-- migraciones) -- sin policy de insert acá, mismo criterio que ventas/renglones_venta. El update
-- de pedidos_encargo (cancelar, editar notas/fecha, marcar entregado con el venta_id del
-- despacho) sí tiene policy directa para authenticated: a diferencia de ventas, acá no hay un
-- invariante financiero que proteger en esas columnas -- el dinero (señas) vive en su propia
-- tabla, escrita solo por función.

create type public.estado_pedido_encargo as enum ('pendiente', 'entregado', 'cancelado');

create table public.pedidos_encargo (
  id uuid primary key default gen_random_uuid(),
  cliente_nombre text not null,
  cliente_telefono text,
  fecha_entrega date not null,
  estado public.estado_pedido_encargo not null default 'pendiente',
  notas text,
  usuario_id uuid not null references public.perfiles (id),
  venta_id uuid references public.ventas (id),
  created_at timestamptz not null default now()
);

create table public.pedido_encargo_items (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.pedidos_encargo (id),
  producto_id uuid not null references public.productos (id),
  cantidad numeric(12, 3) not null check (cantidad > 0)
);

create index pedido_encargo_items_pedido_id_idx on public.pedido_encargo_items (pedido_id);

create table public.senas_pedidos (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.pedidos_encargo (id),
  caja_turno_id uuid not null references public.caja_turnos (id),
  monto numeric(12, 2) not null check (monto > 0),
  usuario_id uuid not null references public.perfiles (id),
  fecha timestamptz not null default now()
);

create index senas_pedidos_pedido_id_idx on public.senas_pedidos (pedido_id);
create index senas_pedidos_caja_turno_id_idx on public.senas_pedidos (caja_turno_id);

alter table public.pedidos_encargo enable row level security;
alter table public.pedido_encargo_items enable row level security;
alter table public.senas_pedidos enable row level security;

create policy "pedidos_encargo_select_authenticated"
  on public.pedidos_encargo for select to authenticated using (true);

create policy "pedidos_encargo_update_authenticated"
  on public.pedidos_encargo for update to authenticated using (true) with check (true);

create policy "pedido_encargo_items_select_authenticated"
  on public.pedido_encargo_items for select to authenticated using (true);

create policy "senas_pedidos_select_authenticated"
  on public.senas_pedidos for select to authenticated using (true);

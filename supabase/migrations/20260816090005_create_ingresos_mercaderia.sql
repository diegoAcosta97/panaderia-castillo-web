-- E15-2: esquema de ingreso de mercadería (docs/backlog/15-ingreso-mercaderia.md)
--
-- Mismo invariante que controles_stock (E11-1): quien carga NO es quien decide si impacta stock.
-- A diferencia de control_stock (funcionalidad enteramente admin), acá cualquier autenticado
-- puede cargar un ingreso -- si lo carga un cajero queda `pendiente_aprobacion` y no toca stock
-- hasta que un admin lo apruebe; si lo carga un admin, la función de creación lo deja `aprobado`
-- e impacta stock en el mismo paso (RF acordado con el dueño: "si lo carga un admin se aprueba
-- automáticamente").
--
-- A diferencia de controles_stock, acá NO hay policies de insert/update para `authenticated`:
-- las tres transiciones (crear, aprobar, rechazar) pasan exclusivamente por funciones SECURITY
-- DEFINER (crear_ingreso_mercaderia / aprobar_ingreso_mercaderia / rechazar_ingreso_mercaderia,
-- migraciones siguientes) -- mismo endurecimiento que E13-1 aplicó a movimientos_stock, aplicado
-- acá desde el vamos en lugar de retrofitearlo después. El único INSERT directo posible desde un
-- cliente (bypaseando esas funciones) queda bloqueado porque no existe policy que lo permita.

create type public.estado_ingreso_mercaderia as enum (
  'pendiente_aprobacion',
  'aprobado',
  'rechazado'
);

create table public.ingresos_mercaderia (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.perfiles (id),
  estado public.estado_ingreso_mercaderia not null default 'pendiente_aprobacion',
  usuario_aprobador_id uuid references public.perfiles (id),
  fecha timestamptz not null default now(),
  fecha_aprobacion timestamptz,
  observaciones text
);

create table public.ingreso_mercaderia_items (
  id uuid primary key default gen_random_uuid(),
  ingreso_mercaderia_id uuid not null references public.ingresos_mercaderia (id),
  producto_id uuid not null references public.productos (id),
  cantidad numeric(12, 3) not null check (cantidad > 0),
  -- Snapshot de stock_actual al momento de cargar el item (auditoría, no se usa para calcular el
  -- ajuste real: eso se recalcula sobre el stock_actual vigente al aprobar, para no perder
  -- ventas/mermas concurrentes ocurridas mientras el ingreso estuvo pendiente).
  stock_previo numeric(12, 3) not null,
  -- Null mientras está pendiente_aprobacion; se completa al crear (si auto-aprobado) o al aprobar.
  stock_resultante numeric(12, 3)
);

create index ingreso_mercaderia_items_ingreso_id_idx
  on public.ingreso_mercaderia_items (ingreso_mercaderia_id);
create index ingreso_mercaderia_items_producto_id_idx
  on public.ingreso_mercaderia_items (producto_id);

alter table public.ingresos_mercaderia enable row level security;
alter table public.ingreso_mercaderia_items enable row level security;

create policy "ingresos_mercaderia_select_admin"
  on public.ingresos_mercaderia
  for select
  to authenticated
  using (public.is_administrador());

create policy "ingreso_mercaderia_items_select_admin"
  on public.ingreso_mercaderia_items
  for select
  to authenticated
  using (public.is_administrador());

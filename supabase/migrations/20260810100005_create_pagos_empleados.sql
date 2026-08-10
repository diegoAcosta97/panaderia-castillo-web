-- Pagos a empleados, siempre asociados al turno de caja abierto en el momento -- mismo criterio
-- que gastos (RF-6.3, 20260806220005_create_gastos.sql): la fila siempre sale del turno abierto,
-- validado en la capa de servicio (features/pagos-empleados/actions.ts) resolviendo el turno
-- abierto server-side, nunca confiando en un caja_turno_id que venga del cliente.
--
-- periodo_desde/periodo_hasta cubren tanto "por_dia" (ambas iguales a la fecha del pago) como
-- "quincena" (rango elegido por el admin) -- cuál aplica depende de empleados.tipo_cobro, no
-- expresable como constraint de tabla (depende de otra fila), se valida en la acción de
-- servidor.
--
-- RLS: solo el administrador puede cargar pagos (a diferencia de gastos, que también puede
-- cargar el cajero). El select sí replica el de gastos (propio, admin, o turno actualmente
-- abierto) para que el preview de cierre de turno (arqueoService.ts) dé el mismo número sin
-- importar qué usuario está cerrando su turno.

create table public.pagos_empleados (
  id uuid primary key default gen_random_uuid(),
  empleado_id uuid not null references public.empleados (id),
  caja_turno_id uuid not null references public.caja_turnos (id),
  monto numeric(12, 2) not null check (monto > 0),
  periodo_desde date not null,
  periodo_hasta date not null,
  observaciones text,
  usuario_id uuid not null references public.perfiles (id),
  fecha timestamptz not null default now(),
  constraint periodo_valido check (periodo_hasta >= periodo_desde)
);

create index pagos_empleados_caja_turno_id_idx on public.pagos_empleados (caja_turno_id);

alter table public.pagos_empleados enable row level security;

create policy "pagos_empleados_select"
  on public.pagos_empleados
  for select
  to authenticated
  using (
    usuario_id = auth.uid()
    or public.is_administrador()
    or caja_turno_id in (select id from public.caja_turnos where estado = 'abierta')
  );

create policy "pagos_empleados_insert"
  on public.pagos_empleados
  for insert
  to authenticated
  with check (usuario_id = auth.uid() and public.is_administrador());

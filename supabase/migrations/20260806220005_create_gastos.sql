-- E5-2: gastos, siempre asociados al turno de caja abierto en el momento (RF-6.3,
-- docs/backlog/05-proveedores-gastos.md)
--
-- "Solo contra el turno abierto" se valida en la capa de servicio (features/gastos/actions.ts),
-- no acá: la FK sola no puede chequear el `estado` de la fila referenciada, y un check
-- constraint no puede mirar otra tabla. La acción del lado del servidor nunca confía en un
-- caja_turno_id que venga del cliente — siempre resuelve el turno abierto ella misma.
--
-- RLS: insert como uno mismo. Select: lo propio, lo del turno actualmente abierto (para que un
-- cajero vea los gastos cargados en su propio turno en curso), o todo si es administrador
-- (reporte completo, docs/backlog/05-proveedores-gastos.md#E5-5).

create table public.gastos (
  id uuid primary key default gen_random_uuid(),
  caja_turno_id uuid not null references public.caja_turnos (id),
  proveedor_id uuid not null references public.proveedores (id),
  concepto text not null,
  monto numeric(12, 2) not null check (monto > 0),
  comprobante_url text,
  usuario_id uuid not null references public.perfiles (id),
  fecha timestamptz not null default now()
);

create index gastos_caja_turno_id_idx on public.gastos (caja_turno_id);

alter table public.gastos enable row level security;

create policy "gastos_select"
  on public.gastos
  for select
  to authenticated
  using (
    usuario_id = auth.uid()
    or public.is_administrador()
    or caja_turno_id in (select id from public.caja_turnos where estado = 'abierta')
  );

create policy "gastos_insert"
  on public.gastos
  for insert
  to authenticated
  with check (usuario_id = auth.uid());

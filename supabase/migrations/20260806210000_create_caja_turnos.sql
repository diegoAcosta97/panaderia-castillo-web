-- E4-1: turnos de caja (docs/backlog/04-caja.md)

create type public.estado_caja_turno as enum ('abierta', 'cerrada');

create table public.caja_turnos (
  id uuid primary key default gen_random_uuid(),
  fecha date not null default current_date,
  etiqueta_turno text,
  usuario_apertura_id uuid not null references public.perfiles (id),
  monto_apertura numeric(12, 2) not null check (monto_apertura >= 0),
  fecha_apertura timestamptz not null default now(),
  usuario_cierre_id uuid references public.perfiles (id),
  monto_cierre_declarado numeric(12, 2),
  efectivo_esperado numeric(12, 2),
  diferencia numeric(12, 2),
  fecha_cierre timestamptz,
  estado public.estado_caja_turno not null default 'abierta',
  observaciones text
);

-- RF-5.5: a lo sumo un turno abierto a la vez. Truco estándar de Postgres: un índice unique
-- sobre una columna cuyo valor es constante ('abierta') en las filas que matchean el where
-- parcial — una segunda fila que intente indexar ese mismo valor viola la unicidad.
create unique index caja_turnos_una_abierta_idx on public.caja_turnos (estado)
  where estado = 'abierta';

alter table public.caja_turnos enable row level security;

-- Caja única compartida: cualquier cajero necesita saber si el registro está abierto, sin
-- importar quién lo abrió. El historial completo (turnos cerrados de otros) es solo para
-- administrador (RF-5.6, docs/backlog/04-caja.md#E4-4).
create policy "caja_turnos_select"
  on public.caja_turnos
  for select
  to authenticated
  using (
    estado = 'abierta'
    or usuario_apertura_id = auth.uid()
    or usuario_cierre_id = auth.uid()
    or public.is_administrador()
  );

create policy "caja_turnos_insert"
  on public.caja_turnos
  for insert
  to authenticated
  with check (usuario_apertura_id = auth.uid());

-- Cualquier autenticado puede cerrar el turno actualmente abierto (no necesariamente quien lo
-- abrió — caja única, puede cambiar el cajero durante el día).
create policy "caja_turnos_update"
  on public.caja_turnos
  for update
  to authenticated
  using (estado = 'abierta' or public.is_administrador())
  with check (true);

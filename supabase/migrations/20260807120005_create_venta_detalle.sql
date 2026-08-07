-- E7-2: beneficios y medios de pago de una venta (docs/backlog/07-punto-de-venta.md)
--
-- Mismo criterio que E7-1: sin policy de insert/update para `authenticated`, todo pasa por
-- confirmar_venta() (y a futuro la conciliación de Mercado Pago en EPIC 8, también vía función).

create type public.medio_pago as enum ('efectivo', 'mercado_pago');
create type public.estado_pago_medio as enum ('pendiente', 'acreditado', 'rechazado');

create table public.venta_ofertas_aplicadas (
  id uuid primary key default gen_random_uuid(),
  venta_id uuid not null references public.ventas (id),
  oferta_id uuid not null references public.ofertas (id),
  veces_aplicada int not null check (veces_aplicada > 0),
  monto_beneficio numeric(12, 2) not null check (monto_beneficio >= 0)
);

create table public.venta_descuentos_aplicados (
  id uuid primary key default gen_random_uuid(),
  venta_id uuid not null references public.ventas (id),
  descuento_id uuid not null references public.descuentos (id),
  monto_aplicado numeric(12, 2) not null check (monto_aplicado >= 0)
);

create table public.venta_medios_pago (
  id uuid primary key default gen_random_uuid(),
  venta_id uuid not null references public.ventas (id),
  medio_pago public.medio_pago not null,
  monto numeric(12, 2) not null check (monto > 0),
  estado_pago public.estado_pago_medio not null default 'pendiente',
  mp_payment_id text,
  mp_referencia_externa text,
  fecha_acreditacion timestamptz
);

create index venta_ofertas_aplicadas_venta_id_idx on public.venta_ofertas_aplicadas (venta_id);
create index venta_descuentos_aplicados_venta_id_idx on public.venta_descuentos_aplicados (venta_id);
create index venta_medios_pago_venta_id_idx on public.venta_medios_pago (venta_id);

alter table public.venta_ofertas_aplicadas enable row level security;
alter table public.venta_descuentos_aplicados enable row level security;
alter table public.venta_medios_pago enable row level security;

create policy "venta_ofertas_aplicadas_select"
  on public.venta_ofertas_aplicadas for select to authenticated
  using (
    exists (
      select 1 from public.ventas v
      where v.id = venta_ofertas_aplicadas.venta_id
        and (
          v.usuario_id = auth.uid()
          or public.is_administrador()
          or v.caja_turno_id in (select id from public.caja_turnos where estado = 'abierta')
        )
    )
  );

create policy "venta_descuentos_aplicados_select"
  on public.venta_descuentos_aplicados for select to authenticated
  using (
    exists (
      select 1 from public.ventas v
      where v.id = venta_descuentos_aplicados.venta_id
        and (
          v.usuario_id = auth.uid()
          or public.is_administrador()
          or v.caja_turno_id in (select id from public.caja_turnos where estado = 'abierta')
        )
    )
  );

create policy "venta_medios_pago_select"
  on public.venta_medios_pago for select to authenticated
  using (
    exists (
      select 1 from public.ventas v
      where v.id = venta_medios_pago.venta_id
        and (
          v.usuario_id = auth.uid()
          or public.is_administrador()
          or v.caja_turno_id in (select id from public.caja_turnos where estado = 'abierta')
        )
    )
  );

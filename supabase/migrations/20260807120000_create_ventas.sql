-- E7-1: ventas y renglones (docs/backlog/07-punto-de-venta.md)
--
-- numero_comprobante sale de una secuencia propia que nunca se reinicia (RF-4.7, nota de
-- numeración en docs/requisitos-no-funcionales.md — pensado para mapear con AFIP a futuro).
--
-- Sin policy de insert/update para `authenticated` a propósito: toda escritura pasa por
-- confirmar_venta()/anular_venta() (SECURITY DEFINER, E7-3/E7-7), nunca un insert/update
-- directo del cliente — así el cálculo de stock y totales nunca puede quedar inconsistente por
-- un cliente que salte pasos.

create type public.estado_venta as enum ('pendiente_pago', 'completada', 'anulada');

create sequence public.ventas_numero_comprobante_seq;

create table public.ventas (
  id uuid primary key default gen_random_uuid(),
  numero_comprobante bigint not null unique
    default nextval('public.ventas_numero_comprobante_seq'),
  caja_turno_id uuid not null references public.caja_turnos (id),
  usuario_id uuid not null references public.perfiles (id),
  subtotal numeric(12, 2) not null,
  total_ofertas numeric(12, 2) not null default 0,
  total_descuentos numeric(12, 2) not null default 0,
  total numeric(12, 2) not null,
  estado public.estado_venta not null default 'pendiente_pago',
  fecha timestamptz not null default now(),
  anulada_por_id uuid references public.perfiles (id),
  fecha_anulacion timestamptz,
  motivo_anulacion text
);

alter sequence public.ventas_numero_comprobante_seq owned by public.ventas.numero_comprobante;

create table public.renglones_venta (
  id uuid primary key default gen_random_uuid(),
  venta_id uuid not null references public.ventas (id),
  producto_id uuid not null references public.productos (id),
  cantidad numeric(12, 3) not null check (cantidad > 0),
  precio_unitario_snapshot numeric(12, 2) not null,
  subtotal numeric(12, 2) not null
);

create index renglones_venta_venta_id_idx on public.renglones_venta (venta_id);

alter table public.ventas enable row level security;
alter table public.renglones_venta enable row level security;

-- Caja compartida: un cajero ve lo propio y lo del turno actualmente abierto (para poder
-- reimprimir el comprobante de la venta que acaba de hacer, sin importar quién más vendió en el
-- mismo turno); el historial completo es solo para administrador (E7-8).
create policy "ventas_select"
  on public.ventas for select to authenticated
  using (
    usuario_id = auth.uid()
    or public.is_administrador()
    or caja_turno_id in (select id from public.caja_turnos where estado = 'abierta')
  );

create policy "renglones_venta_select"
  on public.renglones_venta for select to authenticated
  using (
    exists (
      select 1 from public.ventas v
      where v.id = renglones_venta.venta_id
        and (
          v.usuario_id = auth.uid()
          or public.is_administrador()
          or v.caja_turno_id in (select id from public.caja_turnos where estado = 'abierta')
        )
    )
  );

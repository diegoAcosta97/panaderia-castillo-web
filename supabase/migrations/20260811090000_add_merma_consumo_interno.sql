-- E14-1: nuevos tipos de movimiento y columnas de motivo/empleado (docs/backlog/14-mermas-consumo-interno.md)
--
-- `alter type ... add value` va en su propia migración porque un valor de enum recién agregado
-- no se puede usar en la misma transacción que lo crea -- las funciones registrar_merma/
-- registrar_consumo_interno (E14-2/E14-3) que sí lo usan van en migraciones siguientes, ya con
-- este commit aplicado.
--
-- `motivo`/`empleado_id` son nullable a nivel de columna porque solo aplican a merma/
-- consumo_interno -- la obligatoriedad de `motivo` para esos dos tipos se valida dentro de cada
-- función, no con un `check` de tabla (mismo criterio que el resto del esquema: las funciones
-- SECURITY DEFINER son la única puerta de escritura de movimientos_stock, así que ahí es donde
-- viven sus invariantes). Sin cambios de RLS: movimientos_stock ya no tiene policies de
-- insert/update para `authenticated` desde E13-1, las columnas nuevas heredan esa protección.

alter type public.tipo_movimiento_stock add value 'merma';
alter type public.tipo_movimiento_stock add value 'consumo_interno';

alter table public.movimientos_stock add column motivo text;
alter table public.movimientos_stock add column empleado_id uuid references public.empleados (id);

create index movimientos_stock_empleado_id_idx
  on public.movimientos_stock (empleado_id)
  where empleado_id is not null;

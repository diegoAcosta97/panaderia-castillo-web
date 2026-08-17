-- E16-9: datos de cocción por item de producción (docs/backlog/16-produccion.md) -- RF del dueño:
-- "T° del medio de cocción, T° interna del alimento y Tiempo de cocción" son obligatorios antes
-- de confirmar la producción, para el registro de control de elaboración (BPM). Nullable a nivel
-- de columna porque solo aplican cuando `cantidad_producida > 0` (si no se produjo nada de un
-- item, no hay ningún evento de cocción que registrar) -- la obligatoriedad se valida dentro de
-- completar_produccion (próxima migración), igual criterio que `motivo` en merma/consumo_interno.
--
-- Sin check constraint a nivel de tabla a propósito: ya hay producción real cargada antes de
-- este cambio con `cantidad_producida > 0` y sin estos datos (no existían todavía), un check acá
-- la dejaría en un estado inválido retroactivamente. La función sigue siendo la única puerta de
-- escritura de todos modos (sin policy de insert/update para `authenticated`), así que alcanza
-- con validar ahí.

alter table public.produccion_items
  add column temperatura_medio_coccion numeric(6, 2),
  add column temperatura_interna_alimento numeric(6, 2),
  add column tiempo_coccion_minutos numeric(6, 1);

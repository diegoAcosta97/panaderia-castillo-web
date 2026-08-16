-- E4-4: bloqueo de caja -- conteo sorpresivo obligatorio antes de cerrar turno
-- (docs/backlog/04-caja.md)
--
-- Columna en configuracion_negocio (fila única, mismo patrón que el resto de la config del
-- negocio) en vez de una tabla aparte -- es un solo interruptor global, no un recurso con su
-- propio ciclo de vida.

alter table public.configuracion_negocio
  add column bloqueo_caja_activo boolean not null default false;

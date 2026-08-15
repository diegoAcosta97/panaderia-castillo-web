-- Costo de producto (para calcular margen/rentabilidad, hoy no existe -- solo hay `precio` de
-- venta). Nullable a propósito: el catálogo importado del sistema legado y los productos nuevos
-- no van a tener costo cargado de entrada, y un margen "sin dato" debe tratarse distinto de un
-- margen $0 en cualquier reporte que lo use.
--
-- costo_unitario_snapshot en renglones_venta: igual criterio que precio_unitario_snapshot -- se
-- graba el costo vigente al momento de la venta para que un cambio de costo posterior no
-- distorsione el margen histórico ya reportado. Se completa en confirmar_venta (próxima
-- migración), acá solo se agrega la columna.

alter table public.productos
  add column costo numeric(12, 2) check (costo >= 0);

alter table public.renglones_venta
  add column costo_unitario_snapshot numeric(12, 2);

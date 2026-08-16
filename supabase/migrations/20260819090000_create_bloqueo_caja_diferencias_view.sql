-- E4-5: vista de solo lectura para listar/paginar/filtrar las diferencias de bloqueo de caja
-- (docs/backlog/04-caja.md)
--
-- El listado de "Diferencias detectadas" en /admin/bloqueo-caja traía TODO
-- bloqueo_caja_conteo_items con diferencia != 0 sin límite -- con un conteo por cierre de turno,
-- eso crece sin techo. Para paginar/filtrar por producto, categoría y fecha del lado del
-- servidor (mismo patrón que el resto del admin) hace falta cruzar
-- bloqueo_caja_conteo_items + bloqueo_caja_conteos (fecha) + productos + categorias (nombre) --
-- el cliente de Supabase no arma ese cruce de 3 tablas con filtros propios, así que se resuelve
-- con una vista.
--
-- `security_invoker = true` (Postgres 15+): la vista corre con los permisos de quien consulta,
-- no con los del dueño -- así respeta las RLS de las tablas de abajo tal cual están (conteos e
-- items abiertos a cualquier autenticado desde el fix de permisos, productos/categorias también
-- abiertas a select para autenticado) en vez de necesitar sus propias políticas.

create view public.bloqueo_caja_diferencias
with (security_invoker = true)
as
select
  i.id,
  i.bloqueo_caja_conteo_id,
  i.producto_id,
  p.nombre as producto_nombre,
  p.categoria_id,
  c.nombre as categoria_nombre,
  i.stock_sistema,
  i.stock_contado,
  i.diferencia,
  bc.caja_turno_id,
  bc.fecha
from public.bloqueo_caja_conteo_items i
join public.productos p on p.id = i.producto_id
join public.categorias c on c.id = p.categoria_id
join public.bloqueo_caja_conteos bc on bc.id = i.bloqueo_caja_conteo_id
where i.diferencia <> 0;

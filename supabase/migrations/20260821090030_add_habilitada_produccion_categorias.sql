-- E16-1: producción propia (docs/backlog/16-produccion.md) -- solo productos de una categoría
-- habilitada para producción (RF pedido por el dueño: "solo sanguchería y panadería van a poder
-- listarse") se pueden incluir en una producción. Se agrega una casilla en categorías en vez de
-- filtrar por nombre (mismo criterio que `controla_stock` en productos): editable desde
-- /admin/productos/categorias, no depende de que el nombre contenga una palabra específica.

alter table public.categorias add column habilitada_produccion boolean not null default false;

-- E12-1: política de escritura de configuracion_negocio (docs/backlog/12-configuracion.md)
--
-- La tabla se creó en 20260806093454_create_configuracion_negocio.sql con solo política de
-- lectura -- el comentario de esa migración deja explícito que la escritura (solo
-- administrador) se agrega acá, junto con la pantalla /admin/configuracion que la usa. Fila
-- única, update directo sin invariante multi-fila que proteger: no hace falta una función
-- SECURITY DEFINER, alcanza con una política RLS, mismo patrón que productos_update_admin en
-- 20260806194600_create_productos.sql.

create policy "configuracion_negocio_update_admin"
  on public.configuracion_negocio
  for update
  to authenticated
  using (public.is_administrador())
  with check (public.is_administrador());

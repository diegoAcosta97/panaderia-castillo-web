-- Permite eliminar un producto desde /admin/productos, con confirmación en la UI.
--
-- Solo administrador, update directo sin invariante multi-fila que proteger (mismo criterio que
-- productos_update_admin) -- no hace falta una función SECURITY DEFINER. La protección real
-- contra borrar un producto con historial no vive acá: las FKs de renglones_venta/
-- movimientos_stock/control_stock_detalles/ingreso_mercaderia_items/etiqueta_lotes/
-- oferta_items/descuento_condiciones/pedido_encargo_items/bloqueo_caja_* (todas `references
-- productos(id)` sin `on delete cascade`) rechazan el delete si el producto tiene cualquier
-- historial -- el error de FK se traduce a un mensaje claro del lado de la UI en vez de dejar
-- pasar un borrado que corrompería reportes/comprobantes pasados. Para un producto sin
-- historial (o que ya no se quiere ver ni desactivado), sí se puede borrar de verdad.

create policy "productos_delete_admin"
  on public.productos
  for delete
  to authenticated
  using (public.is_administrador());

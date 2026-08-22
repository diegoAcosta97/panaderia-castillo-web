-- Bugfix: un producto podía terminar con controla_stock = true y stock_actual = NULL. Pasaba así:
-- se creaba con "Controla stock" destildado (stock_actual queda NULL -- ver crearProducto en
-- productosRepository.ts) y después se editaba para tildar "Controla stock"; el diálogo de
-- edición no pedía un stock inicial (ProductoDialog.tsx solo mostraba ese campo al crear) y
-- actualizarProducto nunca tocaba stock_actual. confirmar_venta/registrar_merma/
-- registrar_consumo_interno restan sobre stock_actual sin chequear NULL -- `NULL < cantidad` no
-- es TRUE, así que el chequeo de "stock insuficiente" no frenaba nada, y la resta
-- (NULL - cantidad = NULL) terminaba pisando el NOT NULL de movimientos_stock.stock_resultante
-- recién en el insert del movimiento, con un error críptico ("null value in column
-- stock_resultante...") en vez de un mensaje claro.
--
-- Repara los productos que ya quedaron en ese estado dejándolos en stock_actual = 0 -- no hay
-- forma de saber desde acá cuál era el stock físico real, así que hace falta un conteo de stock
-- (E11, /admin/control-stock) para corregirlo una vez desplegado esto. Después agrega el
-- constraint que impide que se repita a nivel de datos: controla_stock = true exige stock_actual
-- not null. El próximo commit cierra el hueco también del lado del diálogo de edición (para que
-- tildar "Controla stock" pida el stock inicial, igual que al crear) y de las funciones de venta
-- (para que, si igual llegara a pasar, el error sea entendible en vez de un NOT NULL crudo).

update public.productos
  set stock_actual = 0, updated_at = now()
  where controla_stock and stock_actual is null;

alter table public.productos
  add constraint controla_stock_requiere_stock_actual
  check (not controla_stock or stock_actual is not null);

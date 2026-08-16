-- E11-6: el cajero también puede iniciar y cargar un conteo de stock, no solo el administrador
-- (docs/backlog/11-control-stock.md)
--
-- Hasta acá control_stock era "enteramente admin" (E11-1). Se relaja a mismo criterio que
-- ingreso_mercaderia (EPIC 15) / bloqueo de caja (E4-5): cualquier autenticado puede iniciar y
-- cerrar SU PROPIO conteo (en_progreso -> pendiente_aprobacion), pero aprobar/rechazar sigue
-- siendo exclusivo de administrador -- aprobar_control_stock (SECURITY DEFINER) ya lo exige
-- puertas adentro, sin cambios; acá solo se toca quién puede CREAR/CARGAR un conteo y verlo.
--
-- select: antes admin-only: ahora admin ve todos, cualquier autenticado ve los suyos (hace
-- falta para el RETURNING del insert de crearControlStock y para que el cajero vea su propio
-- historial).
-- insert (controles_stock): antes exigía is_administrador(); ahora solo usuario_id = auth.uid()
-- y estado = 'en_progreso' -- cualquier autenticado puede iniciar el suyo.
-- update: una sola policy que separa las dos transiciones por WITH CHECK -- dueño puede cerrar
-- su propio conteo (en_progreso -> pendiente_aprobacion); solo admin puede rechazar cualquier
-- conteo pendiente (pendiente_aprobacion -> rechazado). `aprobado` sigue fuera del alcance de
-- cualquier policy de update (solo llega ahí vía aprobar_control_stock).
-- control_stock_detalles: insert ya no exige is_administrador(), exige que el control padre siga
-- en_progreso Y sea del usuario que inserta (antes no había chequeo de dueño acá, solo de
-- estado -- se lo suma de paso, más preciso que antes).

drop policy "controles_stock_select_admin" on public.controles_stock;
create policy "controles_stock_select"
  on public.controles_stock
  for select
  to authenticated
  using (public.is_administrador() or usuario_id = auth.uid());

drop policy "controles_stock_insert_admin" on public.controles_stock;
create policy "controles_stock_insert"
  on public.controles_stock
  for insert
  to authenticated
  with check (usuario_id = auth.uid() and estado = 'en_progreso');

drop policy "controles_stock_update_admin" on public.controles_stock;
create policy "controles_stock_update"
  on public.controles_stock
  for update
  to authenticated
  using (
    (estado = 'en_progreso' and usuario_id = auth.uid())
    or (public.is_administrador() and estado = 'pendiente_aprobacion')
  )
  with check (
    (estado = 'pendiente_aprobacion' and usuario_id = auth.uid())
    or (public.is_administrador() and estado = 'rechazado')
  );

drop policy "control_stock_detalles_select_admin" on public.control_stock_detalles;
create policy "control_stock_detalles_select"
  on public.control_stock_detalles
  for select
  to authenticated
  using (
    public.is_administrador()
    or exists (
      select 1 from public.controles_stock c
      where c.id = control_stock_id and c.usuario_id = auth.uid()
    )
  );

drop policy "control_stock_detalles_insert_admin" on public.control_stock_detalles;
create policy "control_stock_detalles_insert"
  on public.control_stock_detalles
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.controles_stock c
      where c.id = control_stock_id and c.estado = 'en_progreso' and c.usuario_id = auth.uid()
    )
    and exists (select 1 from public.productos p where p.id = producto_id and p.controla_stock)
  );

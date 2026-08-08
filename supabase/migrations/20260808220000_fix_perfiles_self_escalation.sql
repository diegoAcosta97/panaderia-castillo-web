-- E13-1: cierra una escalación de privilegios encontrada en la auditoría de RLS de EPIC 13.
--
-- `perfiles_update_own` (20260806092724_create_perfiles_y_roles.sql) solo restringe QUÉ fila
-- puede tocar un usuario (`id = auth.uid()`), no qué columnas cambia. Postgres combina policies
-- permisivas del mismo comando con OR tanto en `using` como en `with check` -- así que para su
-- propia fila, esa policy sola alcanza para satisfacer el `with check` combinado,
-- independientemente de lo que exija `perfiles_update_admin`. Resultado: cualquier cajero podía
-- hacer `update perfiles set rol = 'administrador' where id = auth.uid()` por API directa
-- (bypaseando toda la UI) y auto-promoverse -- especialmente grave porque `is_administrador()`
-- lee esta misma columna, así que esto comprometía todos los demás gates de administrador del
-- sistema (productos, ofertas, anular_venta, aprobar_control_stock, etc.).
--
-- RLS filtra filas, no columnas -- no alcanza con ajustar el `with check` de una policy para
-- este caso (comparar el valor viejo contra el nuevo de la misma fila dentro de un `with check`
-- es frágil en Postgres, ver semántica de MVCC de RLS). El fix real, mismo patrón que el resto
-- del sistema (confirmar_venta, anular_venta, aprobar_control_stock, etc.): revocar el
-- privilegio de UPDATE a nivel de TABLA para `authenticated` (Supabase lo otorga por default al
-- crear la tabla, `grant update on perfiles to authenticated` de tabla completa -- un `revoke
-- update (rol, activo) ...` a nivel de columna sobre eso NO alcanza: en Postgres, tener el
-- privilegio a nivel de tabla sigue habilitando cualquier columna aunque se revoque solo a nivel
-- de columna, son caminos de permiso independientes -- verificado empíricamente: el primer
-- intento de este fix, solo con revoke de columna, no bloqueó el exploit) y regrant explícito
-- solo de las columnas que siguen editables por update directo (`nombre_completo`). `rol`/
-- `activo` quedan sin ningún camino de escritura directa -- la única escritura legítima (un
-- administrador cambiando el rol/activo de otro usuario, `features/usuarios/actions.ts`) pasa a
-- una función SECURITY DEFINER, que escribe con los privilegios del dueño de la función (no los
-- del rol `authenticated`) y por lo tanto no depende de este grant.

revoke update on public.perfiles from authenticated;
grant update (nombre_completo) on public.perfiles to authenticated;

-- p_rol/p_activo nullable -- la UI cambia una columna a la vez (docs/backlog/02-roles.md#E2-4,
-- UsuariosTable.tsx), coalesce deja la otra sin tocar en vez de forzar al llamador a mandar el
-- valor actual de la que no está editando.
create or replace function public.actualizar_rol_perfil(
  p_id uuid,
  p_rol public.rol_usuario,
  p_activo boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_administrador() then
    raise exception 'No autorizado.';
  end if;

  update public.perfiles
  set rol = coalesce(p_rol, rol), activo = coalesce(p_activo, activo)
  where id = p_id;
end;
$$;

revoke all on function public.actualizar_rol_perfil(uuid, public.rol_usuario, boolean) from public;
grant execute on function public.actualizar_rol_perfil(uuid, public.rol_usuario, boolean) to authenticated;

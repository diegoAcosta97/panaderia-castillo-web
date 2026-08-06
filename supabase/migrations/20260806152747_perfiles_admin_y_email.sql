-- E2-4: el administrador necesita listar/editar todos los perfiles (alta de usuarios, cambio
-- de rol) — docs/backlog/02-roles.md#E2-4. Las políticas de E0-4 (perfiles_select_own/
-- perfiles_update_own) solo alcanzan para el propio perfil.
--
-- No estaba en el diseño original de docs/data-model.md: se agrega la columna `email` acá
-- (denormalizada desde auth.users) para poder listar usuarios sin tener que llamar a la Admin
-- API de Supabase Auth solo para mostrar un email en una tabla — se mantiene sincronizada por
-- el trigger de alta, nunca se edita a mano.

alter table public.perfiles add column email text;

update public.perfiles p
set email = u.email
from auth.users u
where p.id = u.id and p.email is null;

alter table public.perfiles alter column email set not null;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.perfiles (id, email, nombre_completo)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

-- SECURITY DEFINER a propósito: una policy de `perfiles` que consultara `perfiles` de nuevo
-- reaplicaría RLS en esa subconsulta (recursión/resultado inconsistente). Esta función bypasea
-- RLS puertas adentro, pero solo para mirar la fila del propio `auth.uid()` — no expone nada.
create function public.is_administrador()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.perfiles where id = auth.uid() and rol = 'administrador'
  );
$$;

create policy "perfiles_select_admin"
  on public.perfiles
  for select
  to authenticated
  using (public.is_administrador());

create policy "perfiles_update_admin"
  on public.perfiles
  for update
  to authenticated
  using (public.is_administrador())
  with check (public.is_administrador());

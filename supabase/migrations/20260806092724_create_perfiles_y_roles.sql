-- E0-4: esquema de roles y perfiles internos (docs/backlog/00-fundamentos.md)
--
-- Dos roles por ahora (docs/data-model.md#enums): `administrador` y `cajero`. RLS habilitada
-- desde esta misma migración: cada usuario ve/edita únicamente su propio perfil, sin política
-- para `anon` (acceso cero).
--
-- El trigger crea automáticamente la fila de `perfiles` (rol `cajero` por default) cada vez que
-- se crea un usuario en `auth.users`. En este sistema el único camino a `auth.users` es que un
-- administrador dé de alta a otro usuario (sin sign-up público, ver
-- docs/requisitos-no-funcionales.md#seguridad).

create type public.rol_usuario as enum ('administrador', 'cajero');

create table public.perfiles (
  id uuid primary key references auth.users (id) on delete cascade,
  rol public.rol_usuario not null default 'cajero',
  nombre_completo text,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.perfiles enable row level security;

create policy "perfiles_select_own"
  on public.perfiles
  for select
  to authenticated
  using (id = auth.uid());

create policy "perfiles_update_own"
  on public.perfiles
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.perfiles (id, nombre_completo)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

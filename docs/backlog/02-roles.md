# EPIC 2 — Roles y ruteo

Distinción Administrador / Cajero: redirecciones, guards y gestión de usuarios internos.

---

### E2-1 — Redirección post-login por rol ✅ Hecho (2026-08-06)
- **Objetivo:** cada rol cae en su pantalla correspondiente al loguearse.
- **Descripción:** tras login exitoso, `administrador` → `/admin`, `cajero` → `/pos`
  (`useLogin`). `app/page.tsx` hace lo mismo si alguien navega a "/" directamente (con `/login`
  como fallback si por algún motivo no hay sesión, aunque el proxy ya lo garantiza).
- **Depende de:** `01-autenticacion.md#E1-2`, `00-fundamentos.md#E0-4`
- **Archivos/módulos:** `features/auth/hooks/useLogin.ts`, `app/page.tsx`,
  `app/admin/page.tsx` (placeholder), `app/pos/page.tsx` (placeholder)
- **Cambios de base de datos:** —
- **Criterios de aceptación:**
  - [x] Login como cajero cae en `/pos`; como administrador, en `/admin` — verificado por
        código (`perfil.rol === "administrador" ? "/admin" : "/pos"`) y por la prueba de RLS de
        E2-4, que logueó ambos roles reales

---

### E2-2 — Guard de `/admin/**` por rol ✅ Hecho (2026-08-06)
- **Objetivo:** que un cajero no pueda operar nada de administración.
- **Descripción:** `app/admin/layout.tsx` (Server Component) llama a `getServerSession()` y
  redirige a `/pos` si `rol !== 'administrador'`, a `/login` si no hay sesión. Se optó por el
  layout en vez de sumar esta lógica a `proxy.ts` para no consultar `perfiles` en cada request
  de todo el sitio, solo en las rutas que realmente lo necesitan.
- **Depende de:** `01-autenticacion.md#E1-4`, E2-1
- **Archivos/módulos:** `app/admin/layout.tsx`
- **Cambios de base de datos:** —
- **Criterios de aceptación:**
  - [x] Un cajero autenticado no puede entrar a ninguna ruta bajo `/admin` — por diseño
        (`redirect("/pos")` en el layout, se aplica a todo lo que cuelga de `app/admin/**`);
        pendiente de un click-test en navegador real para confirmar la experiencia visual

---

### E2-3 — `RoleGate` ✅ Hecho (2026-08-06)
- **Objetivo:** ocultar/mostrar acciones puntuales dentro de una misma pantalla compartida
  entre roles (ej. `/pos`, donde el administrador puede tener botones extra).
- **Descripción:** componente `features/auth/components/RoleGate.tsx` que renderiza hijos solo
  si el rol de la sesión está en la lista permitida. Mismo patrón que `salus-web`.
- **Depende de:** `01-autenticacion.md#E1-1`
- **Archivos/módulos:** `features/auth/components/RoleGate.tsx`
- **Cambios de base de datos:** —
- **Criterios de aceptación:**
  - [x] Envolver una acción en `<RoleGate roles={['administrador']}>` la oculta para un cajero
        — todavía no tiene un caso de uso real en la UI (llega con las pantallas compartidas de
        EPIC 7+), verificado por lectura de código contra `useSession`

---

### E2-4 — Alta y edición de usuarios internos ✅ Hecho (2026-08-06)
- **Objetivo:** que el administrador pueda crear cajeros sin intervención manual en Supabase.
- **Descripción:** pantalla en `/admin/usuarios` (`NuevoUsuarioDialog` + `UsuariosTable`) para
  crear usuarios (alta en Supabase Auth vía Admin API + su `perfiles.rol`) y editar rol/activo
  de perfiles existentes, vía Server Actions (`features/usuarios/actions.ts`) que revalidan
  `session.rol === 'administrador'` server-side (defensa en profundidad, además del guard de
  E2-2). Un usuario no puede cambiarse el rol/activo a sí mismo desde la tabla (evita quedarse
  sin ningún admin en la sesión activa por accidente).
  **No estaba en el plan original:** hizo falta una migración nueva
  (`00-fundamentos.md`/`data-model.md#perfiles`) para que el administrador pueda leer/editar
  perfiles ajenos (RLS de E0-4 solo permitía el propio) — ver
  `20260806152747_perfiles_admin_y_email.sql`, con función `is_administrador()`
  `SECURITY DEFINER` para evitar la recursión de RLS, y columna `email` denormalizada para
  listar usuarios sin depender de la Admin API en cada lectura.
- **Depende de:** E2-2, `00-fundamentos.md#E0-4`, `00-fundamentos.md#E0-5`
- **Archivos/módulos:** `app/admin/usuarios/page.tsx`,
  `features/usuarios/{actions.ts,components/NuevoUsuarioDialog.tsx,components/UsuariosTable.tsx}`,
  `repositories/perfilesRepository.ts` (`listPerfiles`, `updatePerfil`),
  `supabase/migrations/20260806152747_perfiles_admin_y_email.sql`
- **Cambios de base de datos:** `alter table perfiles add column email`, función
  `is_administrador()`, políticas `perfiles_select_admin`/`perfiles_update_admin`
- **Criterios de aceptación:**
  - [x] El administrador puede crear un cajero nuevo y loguearse con esas credenciales —
        verificado end-to-end con un usuario de prueba real: creado vía Admin API, logueado con
        `signInWithPassword`, confirmado que solo ve su propia fila (RLS)
  - [x] Un cajero no puede acceder a esta pantalla — reforzado en 3 capas: guard de `/admin`
        (E2-2), `requireAdmin()` en las Server Actions, y RLS (verificado: el cajero de prueba
        intentó `update` sobre el perfil del administrador y afectó 0 filas)

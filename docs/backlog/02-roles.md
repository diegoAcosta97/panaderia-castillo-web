# EPIC 2 — Roles y ruteo

Distinción Administrador / Cajero: redirecciones, guards y gestión de usuarios internos.

---

### E2-1 — Redirección post-login por rol
- **Objetivo:** cada rol cae en su pantalla correspondiente al loguearse.
- **Descripción:** tras login exitoso, `administrador` → `/admin`, `cajero` → `/pos`.
- **Depende de:** `01-autenticacion.md#E1-2`, `00-fundamentos.md#E0-4`
- **Archivos/módulos:** `features/auth/hooks/useLogin.ts`
- **Cambios de base de datos:** —
- **Criterios de aceptación:**
  - [ ] Login como cajero cae en `/pos`; como administrador, en `/admin`

---

### E2-2 — Guard de `/admin/**` por rol
- **Objetivo:** que un cajero no pueda operar nada de administración.
- **Descripción:** `proxy.ts` o layout server-side de `/admin` verifica
  `rol = 'administrador'`; un cajero autenticado que intenta entrar rebota a `/pos`.
- **Depende de:** `01-autenticacion.md#E1-4`, E2-1
- **Archivos/módulos:** `app/admin/layout.tsx`, `lib/supabase/proxy.ts`
- **Cambios de base de datos:** —
- **Criterios de aceptación:**
  - [ ] Un cajero autenticado no puede entrar a ninguna ruta bajo `/admin`

---

### E2-3 — `RoleGate`
- **Objetivo:** ocultar/mostrar acciones puntuales dentro de una misma pantalla compartida
  entre roles (ej. `/pos`, donde el administrador puede tener botones extra).
- **Descripción:** componente `features/auth/components/RoleGate.tsx` que renderiza hijos solo
  si el rol de la sesión está en la lista permitida.
- **Depende de:** `01-autenticacion.md#E1-1`
- **Archivos/módulos:** `features/auth/components/RoleGate.tsx`
- **Cambios de base de datos:** —
- **Criterios de aceptación:**
  - [ ] Envolver una acción en `<RoleGate roles={['administrador']}>` la oculta para un cajero

---

### E2-4 — Alta y edición de usuarios internos
- **Objetivo:** que el administrador pueda crear cajeros sin intervención manual en Supabase.
- **Descripción:** pantalla en `/admin/usuarios` para crear usuarios (alta en Supabase Auth +
  su `perfiles.rol`) y editar/desactivar perfiles existentes.
- **Depende de:** E2-2, `00-fundamentos.md#E0-4`, `00-fundamentos.md#E0-5`
- **Archivos/módulos:** `app/admin/usuarios/page.tsx`, `features/usuarios/*`,
  `repositories/perfilesRepository.ts`
- **Cambios de base de datos:** —
- **Criterios de aceptación:**
  - [ ] El administrador puede crear un cajero nuevo y loguearse con esas credenciales
  - [ ] Un cajero no puede acceder a esta pantalla

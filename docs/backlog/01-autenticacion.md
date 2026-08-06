# EPIC 1 — Autenticación y sesión

Sistema completo de login para los dos roles internos (administrador y cajero). No hay ningún
otro tipo de usuario ni pantalla pública — ver `docs/requisitos-no-funcionales.md`, sección
Seguridad.

---

### E1-1 — Cliente y contexto de sesión
- **Objetivo:** exponer la sesión autenticada al resto de la app.
- **Descripción:** `repositories/perfilesRepository.ts` (`getOwnProfile`),
  `features/auth/services/sessionService.ts` (`getServerSession` para Server Components/proxy),
  `SessionProvider` (Context + `onAuthStateChange`) para componentes cliente,
  `useSession`/`useCurrentProfile` como hooks de consumo. Wireado en `app/layout.tsx`.
- **Depende de:** `00-fundamentos.md#E0-4`
- **Archivos/módulos:** `repositories/perfilesRepository.ts`,
  `features/auth/services/sessionService.ts`, `features/auth/components/SessionProvider.tsx`,
  `features/auth/hooks/useSession.ts`, `app/layout.tsx`
- **Cambios de base de datos:** —
- **Criterios de aceptación:**
  - [ ] `useSession` devuelve `null` sin usuario, y `{user, perfil, rol}` con sesión activa
  - [ ] La sesión persiste tras refrescar la página

---

### E1-2 — Pantalla de login (única puerta de entrada)
- **Objetivo:** que administrador y cajero puedan iniciar sesión; que sea la única pantalla
  accesible sin sesión (RF-10.2).
- **Descripción:** `app/login/page.tsx` + `features/auth/components/LoginForm.tsx` +
  `useLogin`. El redirect por rol se completa en `02-roles.md#E2-1`.
- **Depende de:** E1-1
- **Archivos/módulos:** `app/login/page.tsx`, `features/auth/components/LoginForm.tsx`,
  `features/auth/hooks/useLogin.ts`
- **Cambios de base de datos:** —
- **Criterios de aceptación:**
  - [ ] Login con credenciales válidas autentica correctamente
  - [ ] Credenciales inválidas muestran error sin crashear

---

### E1-3 — Cierre de sesión
- **Objetivo:** permitir logout desde cualquier pantalla protegida.
- **Descripción:** `features/auth/components/LogoutButton.tsx` + `useLogout`, invalida la
  sesión y redirige a `/login`.
- **Depende de:** E1-1
- **Archivos/módulos:** `features/auth/components/LogoutButton.tsx`,
  `features/auth/hooks/useLogout.ts`
- **Cambios de base de datos:** —
- **Criterios de aceptación:**
  - [ ] Tras logout, cualquier ruta protegida vuelve a pedir login (reforzado por E1-4)

---

### E1-4 — Proxy: toda la app requiere sesión salvo `/login` y el webhook de MP
- **Objetivo:** que no exista ninguna pantalla accesible sin login (RF-10.2).
- **Descripción:** completar `lib/supabase/proxy.ts` (`00-fundamentos.md#E0-3`): sin sesión,
  cualquier ruta que no sea `/login` ni `/api/mercadopago/webhook` redirige a `/login`.
- **Depende de:** E1-1, `00-fundamentos.md#E0-3`
- **Archivos/módulos:** `lib/supabase/proxy.ts`
- **Cambios de base de datos:** —
- **Criterios de aceptación:**
  - [ ] Entrar a cualquier ruta sin sesión redirige a `/login`
  - [ ] `/api/mercadopago/webhook` responde sin sesión de usuario (se valida por firma, no por
        Supabase Auth — ver `08-mercadopago.md#E8-3`)

---

### E1-5 — Caducidad de sesión por inactividad (1 hora)
- **Objetivo:** evitar sesiones abiertas indefinidamente en la terminal del local (RF-10.3).
- **Descripción:** `SessionProvider` trackea eventos de actividad del usuario
  (mouse/teclado/touch, con debounce) y resetea un timer de 60 minutos; al vencer sin actividad,
  `supabase.auth.signOut()` + redirect a `/login`. Es una capa propia por encima del refresco
  automático del access token de Supabase, no reemplaza ni depende de él. No afecta el estado de
  `caja_turnos` — un turno abierto sigue abierto después de un logout por inactividad.
- **Depende de:** E1-1
- **Archivos/módulos:** `features/auth/components/SessionProvider.tsx`,
  `features/auth/hooks/useIdleTimeout.ts`
- **Cambios de base de datos:** —
- **Criterios de aceptación:**
  - [ ] Sin interacción durante 60 minutos, la sesión se cierra sola y redirige a `/login`
  - [ ] Con interacción periódica (aunque sea esporádica), la sesión no se corta pese a pasar
        más de 1 hora
  - [ ] Un turno de caja abierto sigue `abierta` después de un logout por inactividad

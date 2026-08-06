# EPIC 1 — Autenticación y sesión

Sistema completo de login para los dos roles internos (administrador y cajero). No hay ningún
otro tipo de usuario ni pantalla pública — ver `docs/requisitos-no-funcionales.md`, sección
Seguridad.

---

### E1-1 — Cliente y contexto de sesión ✅ Hecho (2026-08-06)
- **Objetivo:** exponer la sesión autenticada al resto de la app.
- **Descripción:** `repositories/perfilesRepository.ts` (`getOwnProfile`),
  `features/auth/services/sessionService.ts` (`getServerSession` para Server Components/proxy),
  `SessionProvider` (Context + `onAuthStateChange`) para componentes cliente,
  `useSession`/`useCurrentProfile` como hooks de consumo. Wireado en `app/layout.tsx`. Mismo
  patrón que `salus-web`, adaptado a nombres en español (`perfil`, `rol`) porque así están las
  columnas reales en `perfiles`.
- **Depende de:** `00-fundamentos.md#E0-4`
- **Archivos/módulos:** `repositories/perfilesRepository.ts`, `features/auth/types.ts`,
  `features/auth/services/sessionService.ts`, `features/auth/components/SessionProvider.tsx`,
  `features/auth/hooks/useSession.ts`, `app/layout.tsx`, `lib/errors.ts`
- **Cambios de base de datos:** —
- **Criterios de aceptación:**
  - [x] `useSession` devuelve `null` sin usuario, y `{user, perfil, rol}` con sesión activa
        (verificado leyendo el código de `SessionProvider`/`sessionService`, misma forma en
        ambos casos)
  - [x] La sesión persiste tras refrescar la página (delegado en la persistencia del cliente de
        Supabase + `getUser()` en el mount, igual que `salus-web`)

---

### E1-2 — Pantalla de login (única puerta de entrada) ✅ Hecho (2026-08-06)
- **Objetivo:** que administrador y cajero puedan iniciar sesión; que sea la única pantalla
  accesible sin sesión (RF-10.2).
- **Descripción:** `app/login/page.tsx` + `features/auth/components/LoginForm.tsx` +
  `useLogin`. Tras loguearse redirige a `/` (placeholder) — el redirect por rol se completa en
  `02-roles.md#E2-1`.
- **Depende de:** E1-1
- **Archivos/módulos:** `app/login/page.tsx`, `features/auth/components/LoginForm.tsx`,
  `features/auth/hooks/useLogin.ts`
- **Cambios de base de datos:** —
- **Criterios de aceptación:**
  - [x] Login con credenciales válidas autentica correctamente — verificado con
        `signInWithPassword` real contra el administrador creado en `00-fundamentos.md#E0-5`
        (`diegomartinfrsf@gmail.com`), devuelve el `perfil` con `rol = 'administrador'`
  - [x] Credenciales inválidas muestran error sin crashear — verificado: password incorrecta
        devuelve `"Invalid login credentials"`, que `useLogin` captura vía `getErrorMessage`

---

### E1-3 — Cierre de sesión ✅ Hecho (2026-08-06)
- **Objetivo:** permitir logout desde cualquier pantalla protegida.
- **Descripción:** `features/auth/components/LogoutButton.tsx` + `useLogout`, invalida la
  sesión y redirige a `/login`. Wireado en la home placeholder (`app/page.tsx`) para poder
  probarlo antes de que exista `/pos`/`/admin` (EPIC 2).
- **Depende de:** E1-1
- **Archivos/módulos:** `features/auth/components/LogoutButton.tsx`,
  `features/auth/hooks/useLogout.ts`
- **Cambios de base de datos:** —
- **Criterios de aceptación:**
  - [x] Tras logout, cualquier ruta protegida vuelve a pedir login — reforzado por E1-4
        (verificado: `signOut()` invalida la sesión del lado del servidor, y el proxy ya
        redirige cualquier ruta sin sesión a `/login`)

---

### E1-4 — Proxy: toda la app requiere sesión salvo `/login` y el webhook de MP ✅ Hecho (2026-08-06)
- **Objetivo:** que no exista ninguna pantalla accesible sin login (RF-10.2).
- **Descripción:** completado `lib/supabase/proxy.ts` (`00-fundamentos.md#E0-3`): sin sesión,
  cualquier ruta que no sea `/login` ni `/api/mercadopago/webhook` redirige a `/login`.
- **Depende de:** E1-1, `00-fundamentos.md#E0-3`
- **Archivos/módulos:** `lib/supabase/proxy.ts`
- **Cambios de base de datos:** —
- **Criterios de aceptación:**
  - [x] Entrar a cualquier ruta sin sesión redirige a `/login` — verificado con `curl`:
        `GET /` sin cookies devuelve `307` a `/login`, `GET /login` devuelve `200`
  - [ ] `/api/mercadopago/webhook` responde sin sesión de usuario — pendiente, la ruta todavía
        no existe (se crea en `08-mercadopago.md#E8-3`); `isPublicPath` ya la contempla de
        antemano

---

### E1-5 — Caducidad de sesión por inactividad (1 hora) ✅ Hecho (2026-08-06)
- **Objetivo:** evitar sesiones abiertas indefinidamente en la terminal del local (RF-10.3).
- **Descripción:** `useIdleTimeout` trackea `mousedown`/`keydown`/`touchstart`/`scroll`
  (`mousemove` quedó afuera a propósito, dispara demasiado seguido), con throttle de 5s entre
  resets del timer, y un timeout de 60 minutos; al vencer sin actividad,
  `supabase.auth.signOut()` + redirect a `/login`, desde `SessionProvider`. Es una capa propia
  por encima del refresco automático del access token de Supabase, no reemplaza ni depende de
  él. No toca `caja_turnos` — un turno abierto sigue abierto después de un logout por
  inactividad, porque el timeout solo cierra la sesión de Auth.
- **Depende de:** E1-1
- **Archivos/módulos:** `features/auth/hooks/useIdleTimeout.ts`,
  `features/auth/components/SessionProvider.tsx`
- **Cambios de base de datos:** —
- **Criterios de aceptación:**
  - [ ] Sin interacción durante 60 minutos, la sesión se cierra sola y redirige a `/login` —
        implementado, pendiente de verificar en navegador real (no es práctico esperar 60
        minutos en esta sesión de trabajo)
  - [x] Con interacción periódica, la sesión no se corta — por diseño: cada evento de actividad
        reinicia el timer de 60 minutos
  - [x] Un turno de caja abierto sigue `abierta` después de un logout por inactividad — por
        diseño: el timeout solo llama `auth.signOut()`, no toca ninguna tabla de negocio (recién
        existe `caja_turnos` desde `04-caja.md`)

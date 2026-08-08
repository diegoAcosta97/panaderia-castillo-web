# EPIC 12 — Configuración del negocio

Datos del comercio que se imprimen en comprobantes y etiquetas (la tabla ya se crea y se
siembra en `00-fundamentos.md#E0-6`; acá solo la pantalla para editarla).

---

### E12-1 — Pantalla de edición de `configuracion_negocio` ✅ Hecho (2026-08-08)
- **Descripción:** `/admin/configuracion` — editar nombre comercial, dirección, teléfono, CUIT.
  Formulario controlado simple (`useState` + `onSubmit`, sin react-hook-form/zod, mismo patrón
  que `NuevoGastoForm`), server action `actualizarConfiguracionNegocio` con guard
  `requireAdmin()` (mismo patrón que `features/productos/actions.ts`) y
  `revalidatePath("/admin/configuracion")`.
- **Depende de:** `00-fundamentos.md#E0-6`, `02-roles.md#E2-2`
- **Archivos/módulos:** `app/admin/configuracion/page.tsx`,
  `features/configuracion/components/ConfiguracionForm.tsx`, `features/configuracion/actions.ts`,
  `repositories/configuracionRepository.ts`
- **Cambios de base de datos:** `supabase/migrations/20260808150000_configuracion_negocio_update_admin.sql`
  — la tabla se creó en `00-fundamentos.md#E0-6` solo con política de lectura; esta migración
  agrega la política de escritura (`configuracion_negocio_update_admin`, `using`/`with check`
  `public.is_administrador()`), mismo patrón directo que `productos_update_admin` — no hace falta
  una función `SECURITY DEFINER` para un update de una sola fila sin invariante multi-fila que
  proteger.
- **Criterios de aceptación:**
  - [x] Editar el nombre comercial se refleja en el próximo comprobante/etiqueta impresos —
        verificado en un navegador real (Chrome) contra la base remota: con un administrador de
        prueba (creado y borrado después con `scripts/db/createAdmin.ts` + `auth.admin.deleteUser`,
        mismo criterio que EPIC 8/9) se cambió `nombre_comercial` a `"Panaderia E12 TEST 20260808"`
        y `direccion` a `"Calle Falsa 123"` desde `/admin/configuracion`; se confirmó el guardado
        por lectura directa a la tabla (`SUPABASE_DB_URL`) y, mucho más importante, se hizo una
        venta real de un producto de prueba como `cajero1@prueba.com` (turno abierto, venta de
        $100 en efectivo) y el comprobante en `/pos/comprobante/[ventaId]` mostró el nombre y la
        dirección editados. Producto/categoría de prueba, la venta y sus renglones/medios de pago
        se borraron después por script ad hoc contra `SUPABASE_DB_URL`; `nombre_comercial`/
        `direccion` se restauraron a `"Panadería Castillo"` / `null`. **No verificado:** las
        etiquetas (`features/etiquetas/`) en realidad no leen `configuracion_negocio` en absoluto
        (solo nombre/precio/vencimiento/código de barras del producto) — el criterio tal como está
        redactado solo aplica al comprobante, que sí se verificó extremo a extremo.
  - [x] Un cajero no tiene acceso a esta pantalla — verificado en el navegador con
        `cajero1@prueba.com`: al navegar a `/admin/configuracion` el guard de `app/admin/layout.tsx`
        (E2-2) redirige a `/pos` antes de que se renderice nada del formulario.

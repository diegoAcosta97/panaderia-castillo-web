# EPIC 12 — Configuración del negocio

Datos del comercio que se imprimen en comprobantes y etiquetas (la tabla ya se crea y se
siembra en `00-fundamentos.md#E0-6`; acá solo la pantalla para editarla).

---

### E12-1 — Pantalla de edición de `configuracion_negocio`
- **Descripción:** `/admin/configuracion` — editar nombre comercial, dirección, teléfono, CUIT.
- **Depende de:** `00-fundamentos.md#E0-6`, `02-roles.md#E2-2`
- **Archivos/módulos:** `app/admin/configuracion/page.tsx`,
  `repositories/configuracionRepository.ts`
- **Cambios de base de datos:** —
- **Criterios de aceptación:**
  - [ ] Editar el nombre comercial se refleja en el próximo comprobante/etiqueta impresos
  - [ ] Un cajero no tiene acceso a esta pantalla

# EPIC 13 — Seguridad

RLS transversal y auditoría final. En un desarrollo real conviene ir escribiendo las políticas
epic por epic (a medida que se crea cada tabla), no dejar todo para el final — este epic es el
checkpoint de cierre, no el único momento en que se escribe RLS.

---

### E13-1 — RLS completa en todas las tablas
- **Objetivo:** que ningún dato sensible sea accesible saltándose las reglas de negocio.
- **Descripción:** revisión tabla por tabla (`docs/data-model.md`) de políticas RLS: qué puede
  leer/escribir cada rol. En particular (`docs/requisitos-no-funcionales.md`, sección
  Seguridad): el cajero no puede anular ventas, aprobar ajustes de stock, ni modificar
  precios/ofertas/descuentos/proveedores, ni por UI ni por policy.
- **Depende de:** todas las epics anteriores (se escribe incrementalmente, no se deja todo para
  el final)
- **Archivos/módulos:** `supabase/migrations/..._rls_*.sql` (una o varias por dominio)
- **Cambios de base de datos:** `alter table ... enable row level security`, políticas por
  tabla
- **Criterios de aceptación:**
  - [ ] Con sesión de cajero, intentar anular una venta por API directa (sin pasar por la
        función RPC) es rechazado por RLS
  - [ ] Con sesión de cajero, modificar un precio/oferta/descuento/proveedor por API directa es
        rechazado por RLS
  - [ ] Alcance de lectura entre turnos/cajeros distintos queda explícitamente decidido y
        reflejado en las políticas (a definir en el detalle de esta tarea)

---

### E13-2 — Validación de firma del webhook de Mercado Pago
- **Descripción:** verificar que `app/api/mercadopago/webhook/route.ts`
  (`08-mercadopago.md#E8-3`) valida la firma/secret antes de procesar cualquier notificación, y
  que las credenciales viven en variables de entorno, nunca hardcodeadas.
- **Depende de:** `08-mercadopago.md#E8-3`
- **Archivos/módulos:** `app/api/mercadopago/webhook/route.ts`
- **Cambios de base de datos:** —
- **Criterios de aceptación:**
  - [ ] Un POST al webhook sin firma válida se rechaza y no genera ningún cambio en la base

---

### E13-3 — Auditoría final de integridad de datos
- **Descripción:** revisión cruzada de que todo movimiento de stock, cierre de caja y beneficio
  aplicado a una venta queda con snapshot inmutable (`docs/requisitos-no-funcionales.md`,
  sección Integridad de datos y auditoría).
- **Depende de:** EPIC 3 a 11 completas
- **Archivos/módulos:** —
- **Cambios de base de datos:** —
- **Criterios de aceptación:**
  - [ ] Cambiar el precio de un producto no altera el total de una venta ya confirmada
        anteriormente
  - [ ] Cambiar una oferta/descuento no altera el beneficio ya aplicado en ventas pasadas

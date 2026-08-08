# Backlog — Sistema POS Panadería/Almacén Castillo

Este backlog cubre la construcción completa del sistema (autenticación, roles, catálogo, caja,
proveedores/gastos, ofertas/descuentos, punto de venta, Mercado Pago, comprobante, etiquetas,
control de stock y seguridad). No incluye código, solo la planificación: objetivo, dependencias,
archivos, cambios de base de datos y criterios de aceptación de cada tarea.

Documentos de referencia (leer antes de las tareas):
- [`docs/requisitos-funcionales.md`](../requisitos-funcionales.md) — el "qué" (RF-1 a RF-10)
- [`docs/requisitos-no-funcionales.md`](../requisitos-no-funcionales.md) — decisiones
  transversales (stack, seguridad, numeración de comprobante, moneda, concurrencia)
- [`docs/data-model.md`](../data-model.md) — esquema de base de datos objetivo, con las
  decisiones confirmadas y abiertas
- [`docs/architecture.md`](../architecture.md) — convención de carpetas (`app/`, `components/`,
  `features/`, `repositories/`, `services/`, `hooks/`, `types/`, `lib/`)

## Estado

Las 14 epics (0 a 13) están implementadas y verificadas contra el proyecto de Supabase real y un
navegador real — ver el detalle y las notas de verificación en cada archivo de epic.

## Índice de EPICs

| Epic | Archivo | Contenido |
|---|---|---|
| 0 | [00-fundamentos.md](./00-fundamentos.md) | Scaffolding y base de datos (prerequisito de todo) |
| 1 | [01-autenticacion.md](./01-autenticacion.md) | Login, logout, sesión, caducidad por inactividad |
| 2 | [02-roles.md](./02-roles.md) | Administrador / Cajero, guards, alta de usuarios |
| 3 | [03-productos.md](./03-productos.md) | Productos, categorías y movimientos de stock |
| 4 | [04-caja.md](./04-caja.md) | Apertura/cierre de turno, arqueo |
| 5 | [05-proveedores-gastos.md](./05-proveedores-gastos.md) | Proveedores y registro de gastos |
| 6 | [06-ofertas-descuentos.md](./06-ofertas-descuentos.md) | Combos y reglas de descuento condicionales |
| 7 | [07-punto-de-venta.md](./07-punto-de-venta.md) | Armado de venta, cobro, confirmación, anulación |
| 8 | [08-mercadopago.md](./08-mercadopago.md) | QR dinámico y webhook de confirmación de pago |
| 9 | [09-comprobante.md](./09-comprobante.md) | Comprobante imprimible/PDF de la venta |
| 10 | [10-etiquetas.md](./10-etiquetas.md) | Generación e impresión de etiquetas con código de barras |
| 11 | [11-control-stock.md](./11-control-stock.md) | Conteo periódico de stock y aprobación de ajustes |
| 12 | [12-configuracion.md](./12-configuracion.md) | Datos del comercio |
| 13 | [13-seguridad.md](./13-seguridad.md) | RLS transversal y auditoría final |

## Decisiones registradas

1. **El esquema se crea incrementalmente, epic por epic** (no todo de una vez en EPIC 0), salvo
   `perfiles` y `configuracion_negocio` que son prerequisito transversal. Mismo criterio que
   `biblioteca-liliana-bodoc-web`.
2. **Todas las operaciones que deben ser atómicas** (confirmar venta y descontar stock,
   generar etiquetas e incrementar stock, aprobar un control de stock y ajustar) se resuelven
   con funciones Postgres `SECURITY DEFINER`, nunca con múltiples updates sueltos desde el
   cliente — mismo criterio que `book_appointment` en `salus-web`.
3. **No hay backend independiente.** Toda la lógica vive en Next.js (Server Components/route
   handlers) y Supabase (RLS + funciones RPC).
4. **AFIP queda fuera de alcance**, pero la numeración correlativa de comprobante (EPIC 7) y el
   detalle línea por línea de cada venta ya se diseñan pensando en esa integración futura, para
   no tener que rediseñar nada cuando llegue.

## Orden sugerido de ejecución

```
EPIC 0 completo
  └─▶ EPIC 1 + EPIC 2 (en paralelo, EPIC 2 depende de partes de EPIC 1)
        └─▶ EPIC 3 (productos/stock)
              └─▶ EPIC 4 (caja) + EPIC 6 (ofertas/descuentos) en paralelo
                    └─▶ EPIC 5 (proveedores/gastos, depende de EPIC 4)
                          └─▶ EPIC 7 (punto de venta — depende de EPIC 3, 4 y 6)
                                └─▶ EPIC 8 (Mercado Pago, depende de EPIC 7)
                                      └─▶ EPIC 9 (comprobante, depende de EPIC 7)
                                └─▶ EPIC 10 (etiquetas, depende solo de EPIC 3)
                                └─▶ EPIC 11 (control de stock, depende solo de EPIC 3)
                                └─▶ EPIC 12 (configuración, depende solo de EPIC 0)
                                      └─▶ EPIC 13 (seguridad — checkpoint final, aunque las
                                          políticas de cada tabla conviene escribirlas junto con
                                          cada epic, no dejarlas todas para el final)
```

Notas sobre el orden:
- `04-caja.md#E4-3` (cierre con arqueo) referencia ventas y gastos en su cálculo de efectivo
  esperado; se puede implementar con placeholder `0` en esos dos términos hasta que EPIC 5 y
  EPIC 7 existan, y completarse recién ahí (anotado en la tarea misma).
- EPIC 10, 11 y 12 no dependen del punto de venta y pueden avanzar en paralelo a EPIC 7/8/9 una
  vez terminado EPIC 3.

## Convención de IDs de tareas

Cada tarea tiene un ID `E{n}-{m}` (ej. `E7-3`). Se usa para referenciar dependencias entre
tareas de distintas epics sin repetir el título completo.

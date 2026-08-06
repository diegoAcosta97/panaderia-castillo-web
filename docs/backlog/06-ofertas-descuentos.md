# EPIC 6 — Ofertas y descuentos

Combos (2+ productos) y reglas condicionales sobre el total de la venta (RF-2, RF-3). El motor
de evaluación (E6-5) es la pieza que consume el punto de venta en EPIC 7.

---

### E6-1 — Esquema `ofertas` + `oferta_items`
- **Descripción:** enum `tipo_beneficio_oferta`, tablas `ofertas` y `oferta_items` (ver
  `docs/data-model.md`).
- **Depende de:** `03-productos.md#E3-2`
- **Archivos/módulos:** `supabase/migrations/..._create_ofertas.sql`
- **Cambios de base de datos:** `create type tipo_beneficio_oferta`, `create table ofertas`,
  `create table oferta_items`
- **Criterios de aceptación:**
  - [ ] Existen ambas tablas con sus FKs a `productos`

---

### E6-2 — Esquema `descuentos` + `descuento_condiciones`
- **Descripción:** enums `tipo_efecto_descuento`/`tipo_condicion_descuento`, tablas
  `descuentos` y `descuento_condiciones` (con `cantidad_minima`, ver `docs/data-model.md`).
- **Depende de:** `03-productos.md#E3-2`, `03-productos.md#E3-1`
- **Archivos/módulos:** `supabase/migrations/..._create_descuentos.sql`
- **Cambios de base de datos:** `create type tipo_efecto_descuento`,
  `create type tipo_condicion_descuento`, `create table descuentos`,
  `create table descuento_condiciones`
- **Criterios de aceptación:**
  - [ ] Existen ambas tablas con sus FKs

---

### E6-3 — CRUD de ofertas (admin)
- **Descripción:** alta/edición de combos: elegir 2+ productos con cantidad requerida, tipo de
  beneficio, valor, límite de aplicaciones por venta (opcional), vigencia (RF-2.1, RF-2.4,
  RF-2.5).
- **Depende de:** E6-1, `02-roles.md#E2-2`
- **Archivos/módulos:** `app/admin/ofertas/*`, `features/ofertas/*`,
  `repositories/ofertasRepository.ts`
- **Cambios de base de datos:** —
- **Criterios de aceptación:**
  - [ ] No se puede guardar una oferta con menos de 2 productos (RF-2.1)

---

### E6-4 — CRUD de descuentos (admin)
- **Descripción:** alta/edición de reglas: tipo de efecto, valor, condiciones (monto mínimo /
  producto incluido / categoría incluida, cada una con cantidad mínima configurable), vigencia
  (RF-3.1, RF-3.2, RF-3.4).
- **Depende de:** E6-2, `02-roles.md#E2-2`
- **Archivos/módulos:** `app/admin/descuentos/*`, `features/descuentos/*`,
  `repositories/descuentosRepository.ts`
- **Cambios de base de datos:** —
- **Criterios de aceptación:**
  - [ ] Crear un descuento "10% si el total supera $10.000" se guarda con esa condición
  - [ ] Crear un descuento con condición "al menos 3 unidades de producto X" respeta la
        `cantidad_minima` configurada

---

### E6-5 — Motor de evaluación: ¿qué ofertas y descuentos aplican a un carrito?
- **Objetivo:** lógica pura, testeable de forma aislada, consumida por el punto de venta
  (EPIC 7) para el cálculo en vivo.
- **Descripción:** `services/beneficiosService.ts` — dado un listado de renglones (producto +
  cantidad), devuelve qué ofertas (repetidas hasta donde la cantidad y el límite lo permitan) y
  qué descuentos (evaluando condiciones en conjunto, AND) corresponden, con los montos
  calculados.
- **Depende de:** E6-3, E6-4, `03-productos.md#E3-7`
- **Archivos/módulos:** `services/beneficiosService.ts`
- **Cambios de base de datos:** —
- **Criterios de aceptación:**
  - [ ] Carrito con 4 unidades de A + 4 de B y combo "1A+1B" sin límite aplica el combo 4 veces
        (RF-2.3)
  - [ ] El mismo carrito con `max_aplicaciones_por_venta = 2` aplica el combo solo 2 veces
        (RF-2.4)
  - [ ] Un descuento con condiciones "monto mínimo $10.000 Y categoría X incluida" no se activa
        si falta cualquiera de las dos (RF-3.2)
  - [ ] Un descuento con condición "al menos 3 unidades de producto Y" no se activa con solo 2
        unidades en el carrito

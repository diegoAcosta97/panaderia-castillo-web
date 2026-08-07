# EPIC 6 — Ofertas y descuentos

Combos (2+ productos) y reglas condicionales sobre el total de la venta (RF-2, RF-3). El motor
de evaluación (E6-5) es la pieza que consume el punto de venta en EPIC 7.

---

### E6-1 — Esquema `ofertas` + `oferta_items` ✅ Hecho (2026-08-07)
- **Descripción:** enum `tipo_beneficio_oferta`, tablas `ofertas` y `oferta_items` (ver
  `docs/data-model.md`). RLS: lectura abierta a cualquier autenticado (el motor de evaluación
  corre del lado del cajero en EPIC 7), escritura solo administrador.
- **Depende de:** `03-productos.md#E3-2`
- **Archivos/módulos:** `supabase/migrations/20260807000000_create_ofertas.sql`
- **Cambios de base de datos:** `create type tipo_beneficio_oferta`, `create table ofertas`,
  `create table oferta_items`
- **Criterios de aceptación:**
  - [x] Existen ambas tablas con sus FKs a `productos`

---

### E6-2 — Esquema `descuentos` + `descuento_condiciones` ✅ Hecho (2026-08-07)
- **Descripción:** enums `tipo_efecto_descuento`/`tipo_condicion_descuento`, tablas
  `descuentos` y `descuento_condiciones` (con `cantidad_minima`). Check constraint a nivel de
  base que fuerza que cada condición tenga cargado exactamente el campo que le corresponde
  según su `tipo_condicion` (defensa extra, además de la validación del formulario).
- **Depende de:** `03-productos.md#E3-2`, `03-productos.md#E3-1`
- **Archivos/módulos:** `supabase/migrations/20260807000005_create_descuentos.sql`
- **Cambios de base de datos:** `create type tipo_efecto_descuento`,
  `create type tipo_condicion_descuento`, `create table descuentos`,
  `create table descuento_condiciones`
- **Criterios de aceptación:**
  - [x] Existen ambas tablas con sus FKs — verificado además que el check constraint rechaza
        una condición con `monto_minimo` y `producto_id` cargados a la vez

---

### E6-3 — CRUD de ofertas (admin) ✅ Hecho (2026-08-07)
- **Descripción:** `/admin/ofertas` (`OfertaDialog`: filas dinámicas de producto + cantidad
  requerida, tipo/valor de beneficio, límite de aplicaciones opcional, vigencia). El mínimo de 2
  productos (RF-2.1) se valida en `ofertasRepository.crearOferta`/`actualizarOferta`, no en el
  formulario únicamente. La edición reemplaza los `oferta_items` completos (delete + insert) en
  vez de diffear — más simple, volumen bajo por oferta.
- **Depende de:** E6-1, `02-roles.md#E2-2`
- **Archivos/módulos:** `app/admin/ofertas/page.tsx`,
  `features/ofertas/{actions.ts,components/{OfertaDialog,OfertasTable}.tsx}`,
  `repositories/ofertasRepository.ts`
- **Cambios de base de datos:** —
- **Criterios de aceptación:**
  - [x] No se puede guardar una oferta con menos de 2 productos (RF-2.1) — verificado con un
        insert real vía el repositorio (1 producto → rechazado con mensaje claro)

---

### E6-4 — CRUD de descuentos (admin) ✅ Hecho (2026-08-07)
- **Descripción:** `/admin/descuentos` (`DescuentoDialog`: condiciones dinámicas, cada una
  muestra solo los campos que le corresponden según el tipo elegido — monto mínimo, o
  producto/categoría + cantidad mínima). `descuentosRepository` sanea los campos por
  `tipo_condicion` antes de guardar (nunca manda `producto_id` en una condición de
  `monto_minimo`, etc.), para respetar el check constraint de E6-2 sin que dependa de que el
  formulario se porte bien.
- **Depende de:** E6-2, `02-roles.md#E2-2`
- **Archivos/módulos:** `app/admin/descuentos/page.tsx`,
  `features/descuentos/{actions.ts,components/{DescuentoDialog,DescuentosTable}.tsx}`,
  `repositories/descuentosRepository.ts`
- **Cambios de base de datos:** —
- **Criterios de aceptación:**
  - [x] Crear un descuento "10% si el total supera $10.000" se guarda con esa condición —
        verificado con un insert real (condición `monto_minimo`)
  - [x] Crear un descuento con condición "al menos 3 unidades de producto X" respeta la
        `cantidad_minima` configurada — cubierto por la prueba de E6-5 (ver más abajo)

---

### E6-5 — Motor de evaluación: ¿qué ofertas y descuentos aplican a un carrito? ✅ Hecho (2026-08-07)
- **Objetivo:** lógica pura, testeable de forma aislada, consumida por el punto de venta
  (EPIC 7) para el cálculo en vivo.
- **Descripción:** `services/beneficiosService.ts` — `evaluarOfertas`, `evaluarDescuentos` y
  `evaluarBeneficios` (combina ambas). Sin llamadas a Supabase: recibe productos/ofertas/
  descuentos ya cargados y un `fecha` opcional (default `new Date()`, inyectable para tests).
  Ofertas y descuentos se calculan sobre el mismo subtotal original y se suman (RF-3.6, no hay
  compounding de uno sobre el otro) — decisión de diseño anotada en el propio archivo.
- **Depende de:** E6-3, E6-4, `03-productos.md#E3-7`
- **Archivos/módulos:** `services/beneficiosService.ts`
- **Cambios de base de datos:** —
- **Criterios de aceptación:** (los 4 exactos del backlog, más 3 casos extra, corridos con
  `tsx` contra datos sintéticos — sin tocar la base — todos ✅)
  - [x] Carrito con 4 unidades de A + 4 de B y combo "1A+1B" sin límite aplica el combo 4 veces
  - [x] El mismo carrito con `max_aplicaciones_por_venta = 2` aplica el combo solo 2 veces
  - [x] Un descuento con condiciones "monto mínimo $10.000 Y categoría X incluida" no se activa
        si falta cualquiera de las dos (probado en ambas direcciones: solo monto, solo
        categoría, y ambas)
  - [x] Un descuento con condición "al menos 3 unidades de producto Y" no se activa con solo 2
        unidades en el carrito (y sí se activa con 3)

---

## Nota de verificación (2026-08-07)

Dos rondas de pruebas reales, ambas limpiadas al terminar (verificado con un `select` final
sobre las 4 tablas involucradas, 0 filas `_test%` restantes):
1. **Lógica pura** (`services/beneficiosService.ts`, sin base de datos): los 4 escenarios del
   backlog + 3 variantes, con productos/ofertas/descuentos sintéticos.
2. **Contra la base real**: constraint de "al menos 2 productos" en `ofertasRepository`,
   creación válida de oferta y descuento, y RLS (cajero de prueba no pudo crear ni ofertas ni
   descuentos, pero sí pudo leerlos — necesario para que el punto de venta funcione en EPIC 7).

# EPIC 13 — Seguridad

RLS transversal y auditoría final. En un desarrollo real conviene ir escribiendo las políticas
epic por epic (a medida que se crea cada tabla), no dejar todo para el final — este epic es el
checkpoint de cierre, no el único momento en que se escribe RLS.

---

### E13-1 — RLS completa en todas las tablas ✅ Hecho (2026-08-08)
- **Objetivo:** que ningún dato sensible sea accesible saltándose las reglas de negocio.
- **Descripción:** auditoría tabla por tabla de las políticas RLS de las ~20 tablas del esquema
  (perfiles, configuracion_negocio, categorias, productos, movimientos_stock, caja_turnos,
  proveedores, gastos, ofertas/oferta_items, descuentos/descuento_condiciones,
  ventas/renglones_venta/venta_ofertas_aplicadas/venta_descuentos_aplicados/venta_medios_pago,
  etiqueta_lotes, controles_stock/control_stock_detalles) contra
  `docs/requisitos-no-funcionales.md` (sección Seguridad). La inmensa mayoría ya estaba
  correctamente cerrada (productos/ofertas/descuentos/proveedores con insert/update
  `is_administrador()`; ventas/renglones/beneficios/medios de pago sin ningún insert/update
  policy para `authenticated`, solo escribibles vía `confirmar_venta`/`anular_venta`/etc.
  SECURITY DEFINER; movimientos_stock select admin-only, sin insert/update directo). Se
  encontraron y corrigieron **dos gaps reales**, ambos de escritura por API directa
  (bypaseando la UI/las funciones RPC pensadas para eso):

  **Gap 1 — crítico — auto-escalación de privilegios en `perfiles`.**
  `perfiles_update_own` (`20260806092724_create_perfiles_y_roles.sql`) solo restringía **qué
  fila** podía tocar un usuario (`id = auth.uid()`), no qué columnas cambiaba. Postgres combina
  policies permisivas del mismo comando con OR tanto en `using` como en `with check` — para su
  propia fila, esa policy sola alcanzaba para satisfacer el `with check` combinado,
  independientemente de lo que exigiera `perfiles_update_admin`. Cualquier cajero podía hacer
  `update perfiles set rol = 'administrador' where id = auth.uid()` por API directa y
  auto-promoverse — grave porque `is_administrador()` lee esa misma columna, comprometiendo
  todos los demás gates de administrador del sistema (productos, ofertas, `anular_venta`,
  `aprobar_control_stock`, etc.). **Verificado el exploit contra la base real antes del fix**
  (ver criterios de aceptación).
  Fix (`20260808220000_fix_perfiles_self_escalation.sql`): RLS filtra filas, no columnas — no
  alcanza con ajustar el `with check` de una policy (comparar valor viejo vs. nuevo de la misma
  fila dentro de un `with check` es frágil en Postgres). Se revocó el privilegio de UPDATE **a
  nivel de tabla completa** para `authenticated` sobre `perfiles` y se regranteó explícitamente
  solo `nombre_completo`. **Primer intento de este fix fallido y corregido en el momento:** un
  `revoke update (rol, activo) on perfiles from authenticated` a nivel de *columna* no bloqueó
  el exploit — Supabase ya le había otorgado UPDATE a nivel de *tabla completa* a `authenticated`
  por default, y en Postgres tener el privilegio a nivel de tabla sigue habilitando cualquier
  columna aunque se revoque solo a nivel de columna (son caminos de permiso independientes).
  Confirmado con `information_schema.column_privileges`/`table_privileges` contra la base real
  antes de dar con el fix correcto. La única escritura legítima de `rol`/`activo` (un
  administrador editando otro usuario, `features/usuarios/actions.ts`) pasa ahora por
  `actualizar_rol_perfil` (SECURITY DEFINER, gated por `is_administrador()`,
  `p_rol`/`p_activo` nullable vía `coalesce` para cambiar una columna sin tocar la otra).

  **Gap 2 — cierre de caja forjable por API directa.** `caja_turnos_update`
  (`20260806210000_create_caja_turnos.sql`) tenía `with check (true)` sin ninguna restricción
  sobre los valores nuevos: cualquier cajero con el turno todavía `abierta` podía, por API
  directa, forjar `monto_cierre_declarado`/`efectivo_esperado`/`diferencia` a cualquier valor —
  justo lo que pide que sea confiable la sección "Integridad de datos y auditoría" de
  `docs/requisitos-no-funcionales.md`. Además, como el `using` dejaba pasar a un administrador
  sin importar el `estado`, un turno ya `cerrada` seguía siendo editable para siempre por un
  admin, contra el mismo requisito ("queda guardado de forma inmutable una vez cerrado").
  Fix (`20260808220005_create_cerrar_turno_function.sql`): mismo patrón que
  `confirmar_venta`/`anular_venta`/`aprobar_control_stock` — función `cerrar_turno` SECURITY
  DEFINER como única puerta de `abierta` → `cerrada`, calcula `efectivo_esperado` ella misma
  (nunca confía en el cliente), y se **eliminó la policy de update por completo**: no queda
  ningún camino de escritura directa para `caja_turnos`, ni para cerrar ni para editar un turno
  ya cerrado (ni siquiera un administrador).
  **Bug funcional preexistente encontrado de paso y corregido:**
  `features/caja/services/arqueoService.ts#calcularEfectivoEsperado` tenía `ventasEfectivo`
  hardcodeado en `0` desde EPIC 4 con un TODO ("completar cuando exista venta_medios_pago") que
  nunca se completó después de que EPIC 7 creó esa tabla — **todo turno cerrado hasta esta
  migración calculó su `efectivo_esperado`/`diferencia` sin contar ninguna venta en efectivo**.
  `cerrar_turno` lo corrige (suma `venta_medios_pago.monto` de ventas `completada` con
  `medio_pago = 'efectivo'` del turno); `calcularEfectivoEsperado` (ahora solo la vista previa
  en `/pos/caja/cierre`, ya no la escritura real) se actualizó igual vía la nueva
  `ventasRepository.sumaVentasEfectivoPorTurno`, para que la vista previa coincida con lo que la
  función va a persistir. Solo cuenta ventas `completada` (no `pendiente_pago` ni `anulada`):
  una venta combinada (efectivo + Mercado Pago) cancelada antes de acreditarse
  (`cancelar_venta_pendiente`) deja su porción en efectivo con `estado_pago = 'acreditado'` pero
  la venta entera pasa a `anulada` sin revertir ese medio — limitación preexistente de esa
  función, fuera del alcance de este fix; no contar esas ventas es la opción conservadora (en el
  peor caso señala una diferencia a favor de la caja, nunca la esconde).

  **Alcance de lectura entre turnos/cajeros** (tercer criterio de aceptación): ya estaba
  decidido y es consistente en todo el esquema — `usuario_id = auth.uid() OR is_administrador()
  OR <turno padre> in (select id from caja_turnos where estado = 'abierta')`, aplicado
  idénticamente en `ventas`, `renglones_venta`, `venta_ofertas_aplicadas`,
  `venta_descuentos_aplicados`, `venta_medios_pago` y `gastos` (propio + admin + cualquier cosa
  atada al turno actualmente abierto — caja única compartida). `caja_turnos` tiene la versión
  análoga (apertura/cierre propios + admin + turno actualmente abierto). Sin gap.
- **Depende de:** todas las epics anteriores
- **Archivos/módulos:** `supabase/migrations/20260808220000_fix_perfiles_self_escalation.sql`,
  `supabase/migrations/20260808220005_create_cerrar_turno_function.sql`,
  `repositories/perfilesRepository.ts`, `repositories/cajaTurnosRepository.ts`,
  `repositories/ventasRepository.ts` (`sumaVentasEfectivoPorTurno`),
  `features/caja/actions.ts`, `features/caja/services/arqueoService.ts`, `types/database.ts`
- **Cambios de base de datos:** `revoke`/`grant` de columna en `perfiles`, función
  `actualizar_rol_perfil`; función `cerrar_turno`, `drop policy caja_turnos_update`
- **Criterios de aceptación:**
  - [x] Con sesión de cajero, intentar anular una venta por API directa (sin pasar por la
        función RPC) es rechazado por RLS — ya estaba correcto (`ventas` sin policy de update
        para `authenticated`, confirmado en la auditoría; no fue necesario tocar nada)
  - [x] Con sesión de cajero, modificar un precio/oferta/descuento/proveedor por API directa es
        rechazado por RLS — ya estaba correcto (`is_administrador()` en insert/update de las 4
        tablas, confirmado en la auditoría; no fue necesario tocar nada)
  - [x] Alcance de lectura entre turnos/cajeros distintos queda explícitamente decidido y
        reflejado en las políticas — ya lo estaba, documentado arriba
  - [x] **(no listado originalmente, encontrado durante la auditoría)** Con sesión de cajero,
        auto-promoverse a administrador por API directa es rechazado — verificado el exploit
        contra la base real **antes** del fix (`update perfiles set rol='administrador' where
        id=auth.uid()` devolvía éxito y el cajero de prueba quedaba realmente promovido — se
        restauró su rol inmediatamente después de confirmar el exploit) y **después** del fix
        (mismo intento devuelve `permission denied for table perfiles`, rol sin cambios).
        Flujo legítimo verificado en un navegador real: un administrador de prueba cambiando el
        rol de otro usuario desde `/admin/usuarios` (toggle ida y vuelta cajero↔administrador)
        sigue funcionando.
  - [x] **(no listado originalmente, encontrado durante la auditoría)** Con sesión de cajero,
        forjar el cierre de un turno por API directa (`update caja_turnos set estado='cerrada',
        efectivo_esperado=1, monto_cierre_declarado=999999, ...`) es rechazado — verificado
        contra la base real (0 filas afectadas, turno sigue `abierta` con los campos de cierre
        en `null`). Flujo legítimo verificado tanto contra la base real (abrir turno, vender
        $300 en efectivo, gastar $50, cerrar vía `cerrar_turno` → `efectivo_esperado = 1250`
        exacto = 1000 apertura + 300 venta − 50 gasto) como en un navegador real
        (`/pos/caja` → `/pos/caja/cierre`, vista previa "$500.00" correcta con apertura sola,
        cierre exitoso, redirige a `/pos/caja`).

---

### E13-2 — Validación de firma del webhook de Mercado Pago ✅ Hecho (2026-08-08)
- **Descripción:** revisado `app/api/mercadopago/webhook/route.ts` contra el diseño documentado
  en `docs/backlog/08-mercadopago.md#E8-3`: las notificaciones de Código QR de Mercado Pago **no
  soportan validación por firma** (confirmado contra la documentación oficial durante EPIC 8).
  El modelo de seguridad real, ya implementado desde EPIC 8 y confirmado sin cambios en esta
  auditoría: el payload del webhook se trata como un disparador no confiable — la ruta nunca
  actúa sobre lo que dice el body, siempre reconsulta el estado real de la orden contra la
  propia API de Mercado Pago (`getOrdenQr`, con el access token del servidor) antes de tocar la
  base. Confirmado que `MERCADOPAGO_ACCESS_TOKEN` se lee solo de `process.env`
  (`lib/mercadopago.ts`), nunca hardcodeado.
  **Hallazgo:** `MERCADOPAGO_WEBHOOK_SECRET` estaba declarada como obligatoria en el schema de
  `lib/env.ts` pero **no se usaba en ningún lado** del código (grep del repo completo) — variable
  vestigial que podía dar la falsa impresión de que existe validación por firma en algún lado.
  Se eliminó del schema de `lib/env.ts` y de `.env.example`, con un comentario explicando por
  qué no hace falta (apunta a esta sección y a E8-3).
- **Depende de:** `08-mercadopago.md#E8-3`
- **Archivos/módulos:** `lib/env.ts`, `.env.example`
- **Cambios de base de datos:** —
- **Criterios de aceptación:**
  - [x] ~~Un POST al webhook sin firma válida se rechaza y no genera ningún cambio en la
        base~~ — no aplica tal como está redactado: MP no ofrece firma para notificaciones QR
        (documentado ya en E8-3). El criterio real y equivalente — un payload falso/manipulado
        no genera ningún cambio en la base porque la ruta siempre reconsulta el estado real
        contra la API de MP antes de escribir — ya estaba cubierto e implementado desde EPIC 8;
        confirmado sin cambios en esta auditoría (no se tocó `route.ts`).

---

### E13-3 — Auditoría final de integridad de datos ✅ Hecho (2026-08-08)
- **Descripción:** revisión cruzada de inmutabilidad de snapshots (`docs/requisitos-no-funcionales.md`,
  sección Integridad de datos y auditoría):
  - `renglones_venta.precio_unitario_snapshot`, `venta_ofertas_aplicadas.monto_beneficio` y
    `venta_descuentos_aplicados.monto_aplicado` se escriben una única vez en `confirmar_venta` y
    ninguna otra función los vuelve a tocar (grep de `update.*renglones_venta` /
    `update.*venta_ofertas_aplicadas` / `update.*venta_descuentos_aplicados` en todas las
    migraciones: cero resultados). `venta_medios_pago` sí se actualiza después
    (`registrar_qr_pago`/`procesar_resultado_pago_mp`) pero es estado de pago
    (`pendiente→acreditado/rechazado`), no un snapshot de precio/beneficio — correcto que
    cambie.
  - La UI nunca relee un valor mutable en lugar del snapshot: `Comprobante.tsx` (EPIC 9) y
    `app/admin/ventas/[id]/page.tsx` renderizan `precio_unitario_snapshot`/`subtotal`/
    `monto_beneficio`/`monto_aplicado`, nunca `producto.precio` ni el valor actual de una
    oferta/descuento — confirmado leyendo ambos componentes.
  - El cierre de caja (arqueo) ahora sí queda inmutable una vez cerrado (ver Gap 2 de E13-1 —
    antes de ese fix, un administrador podía editar un turno cerrado indefinidamente; con la
    policy de update eliminada y `cerrar_turno` como única puerta de `abierta→cerrada`, ya no
    hay ningún camino de escritura una vez `estado = 'cerrada'`).
- **Depende de:** EPIC 3 a 11 completas
- **Archivos/módulos:** — (solo auditoría; el único cambio de código que esto motivó está en
  E13-1, Gap 2)
- **Cambios de base de datos:** —
- **Criterios de aceptación:**
  - [x] Cambiar el precio de un producto no altera el total de una venta ya confirmada
        anteriormente — garantizado por `precio_unitario_snapshot` (write-once, confirmado
        arriba) y por cómo lo renderiza el comprobante (no relee `producto.precio`)
  - [x] Cambiar una oferta/descuento no altera el beneficio ya aplicado en ventas pasadas —
        mismo criterio con `monto_beneficio`/`monto_aplicado`

---

## Nota de auditoría (2026-08-08)

Todo lo de este epic se verificó contra el proyecto de Supabase real (nunca contra mocks): los
dos exploits de E13-1 se probaron de verdad contra la base antes y después de cada fix (incluido
un primer intento de fix que resultó insuficiente — revoke a nivel de columna vs. tabla — y se
corrigió en el momento tras confirmarlo empíricamente con `information_schema`), y los flujos
legítimos (edición de rol/activo desde `/admin/usuarios`, apertura/venta/gasto/cierre de turno
desde `/pos`) se verificaron tanto contra la base real como en un navegador real. Datos de
prueba (usuarios, turnos, productos, categoría, proveedor, venta) se crearon y se borraron
después con scripts ad hoc contra `SUPABASE_DB_URL`, mismo criterio que EPICs anteriores.

# EPIC 8 — Integración Mercado Pago

QR dinámico (Checkout Pro / QR API) para cobrar en el mostrador, con confirmación automática
por webhook (RF-7, decisión registrada en `docs/data-model.md`).

---

### E8-1 — Cliente del SDK de Mercado Pago
- **Descripción:** `lib/mercadopago.ts` con el cliente configurado desde variables de entorno
  (access token del comercio, nunca hardcodeado).
- **Depende de:** `00-fundamentos.md#E0-1`
- **Archivos/módulos:** `lib/mercadopago.ts`, `.env.example`
- **Cambios de base de datos:** —
- **Criterios de aceptación:**
  - [ ] El cliente se instancia sin error con credenciales de prueba (sandbox)

---

### E8-2 — Generación de QR dinámico por venta
- **Descripción:** `features/mercadopago/services/qrService.ts` — dado un monto (total o la
  porción de la venta asignada a Mercado Pago), crea la preferencia/orden en MP y devuelve la
  data para renderizar el QR. Se guarda `mp_referencia_externa` en `venta_medios_pago` para
  poder matchear el webhook (RF-7.1).
- **Depende de:** E8-1, `07-punto-de-venta.md#E7-2`
- **Archivos/módulos:** `features/mercadopago/services/qrService.ts`,
  `features/ventas/components/QrMercadoPago.tsx`
- **Cambios de base de datos:** —
- **Criterios de aceptación:**
  - [ ] Cobrar (parcial o total) con Mercado Pago muestra un QR válido, escaneable por la app
        de MP en sandbox

---

### E8-3 — Webhook de confirmación de pago
- **Descripción:** `app/api/mercadopago/webhook/route.ts` — valida la firma/secret del
  webhook, busca el `venta_medios_pago` correspondiente por `mp_referencia_externa`, actualiza
  `estado_pago` y `mp_payment_id`. Cuando todos los medios de pago de la venta quedan
  `acreditado`, la venta pasa de `pendiente_pago` a `completada` y recién ahí se descuenta stock
  (RF-4.4, RF-7.2). El diseño detallado de esta tarea debe definir si esto reutiliza
  `confirmar_venta` (`07-punto-de-venta.md#E7-3`) o una variante que separe "crear venta
  pendiente" de "confirmarla al acreditarse".
- **Depende de:** E8-2, `07-punto-de-venta.md#E7-3`
- **Archivos/módulos:** `app/api/mercadopago/webhook/route.ts`
- **Cambios de base de datos:** —
- **Criterios de aceptación:**
  - [ ] Un webhook con firma inválida se rechaza (401/403) sin modificar ninguna venta
  - [ ] Un webhook válido de pago acreditado deja la venta en `completada` y descuenta stock
  - [ ] Un webhook de pago rechazado/expirado deja la venta disponible para reintentar el cobro
        (RF-7.3), sin descontar stock

---

### E8-4 — Pantalla de espera de pago
- **Descripción:** mientras la venta está `pendiente_pago`, la pantalla de cobro espera la
  confirmación (polling o Supabase Realtime) y avanza sola a la impresión del comprobante
  (EPIC 9) al confirmarse.
- **Depende de:** E8-3
- **Archivos/módulos:** `features/ventas/components/EsperandoPagoMP.tsx`
- **Cambios de base de datos:** —
- **Criterios de aceptación:**
  - [ ] Al confirmarse el webhook (probado con un pago sandbox real), la pantalla avanza sola,
        sin recargar la página

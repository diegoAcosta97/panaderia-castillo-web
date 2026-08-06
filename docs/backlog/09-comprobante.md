# EPIC 9 — Comprobante de venta

Comprobante imprimible/descargable en PDF a partir de los datos de la venta (RF-4.7),
preparado en detalle para una futura factura AFIP sin serlo todavía.

---

### E9-1 — Vista imprimible del comprobante
- **Descripción:** `app/pos/comprobante/[ventaId]/page.tsx`, con CSS `@media print`, arma el
  comprobante a partir de `ventas` + `renglones_venta` + ofertas/descuentos/medios de pago
  aplicados + `configuracion_negocio`. Incluye número de comprobante, fecha, detalle de
  productos/cantidades/precios, beneficios aplicados, medios de pago y total. Sin librería de
  PDF en servidor: el "Guardar como PDF" del diálogo de impresión del navegador cubre el
  requisito (decisión registrada en `docs/data-model.md`).
- **Depende de:** `07-punto-de-venta.md#E7-1`, `07-punto-de-venta.md#E7-2`,
  `00-fundamentos.md#E0-6`
- **Archivos/módulos:** `app/pos/comprobante/[ventaId]/page.tsx`,
  `features/ventas/components/Comprobante.tsx`, `lib/print.ts`
- **Cambios de base de datos:** —
- **Criterios de aceptación:**
  - [ ] El comprobante muestra correctamente una venta con oferta y descuento aplicados y dos
        medios de pago
  - [ ] "Guardar como PDF" desde el diálogo de impresión produce un PDF legible

---

### E9-2 — Reimpresión desde el historial
- **Descripción:** desde `/admin/ventas` (`07-punto-de-venta.md#E7-8`), acceso directo al
  comprobante de cualquier venta pasada.
- **Depende de:** E9-1, `07-punto-de-venta.md#E7-8`
- **Archivos/módulos:** `app/admin/ventas/page.tsx`
- **Cambios de base de datos:** —
- **Criterios de aceptación:**
  - [ ] Reimprimir una venta de hace varios días muestra los mismos precios que en el momento
        de la venta (snapshot, no el precio actual del producto)

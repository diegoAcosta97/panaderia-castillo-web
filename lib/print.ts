// Etiquetas (EPIC 10) y comprobante (EPIC 9) comparten el mismo patrón: sin librería de PDF en
// servidor, el diálogo "Guardar como PDF" de window.print() cubre el requisito de
// descargable/imprimible (docs/data-model.md).
export function imprimir() {
  window.print();
}

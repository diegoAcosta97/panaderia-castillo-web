// Formato es-AR (punto de miles, coma decimal) para montos que solo se MUESTRAN (nunca para
// inputs nativos type="number", que siempre usan punto sin importar el locale del navegador).
export function formatearMoneda(monto: number): string {
  return `$${monto.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

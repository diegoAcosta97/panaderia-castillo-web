// Export a CSV desde el browser, sin librería ni backend de por medio -- mismo espíritu que
// lib/print.ts (window.print() para etiquetas/comprobante). El BOM al inicio es necesario para
// que Excel en Windows detecte UTF-8 y no rompa acentos/ñ.
function escaparCelda(valor: unknown): string {
  const texto = valor === null || valor === undefined ? "" : String(valor);
  if (/[",\n]/.test(texto)) {
    return `"${texto.replace(/"/g, '""')}"`;
  }
  return texto;
}

export function descargarCsv(
  filename: string,
  headers: string[],
  rows: unknown[][],
): void {
  const lineas = [headers, ...rows].map((fila) => fila.map(escaparCelda).join(","));
  const csv = "﻿" + lineas.join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

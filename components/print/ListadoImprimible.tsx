// Reemplaza el CSV (que no abre bien en Excel es-AR por el choque de comas) por un listado
// imprimible: mismo patrón que Comprobante/Etiqueta -- HTML oculto en pantalla, visible solo en
// @media print, para que el usuario elija "Guardar como PDF" desde el diálogo de impresión.
export function ListadoImprimible({
  titulo,
  headers,
  rows,
}: {
  titulo: string;
  headers: string[];
  rows: (string | number)[][];
}) {
  return (
    <div className="hidden flex-col gap-4 p-6 print:flex">
      <h1 className="text-xl font-semibold">{titulo}</h1>
      <p className="text-sm text-muted-foreground">
        Generado el {new Date().toLocaleString("es-AR")}
      </p>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b text-left">
            {headers.map((h) => (
              <th key={h} className="py-1 pr-4 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((fila, i) => (
            <tr key={i} className="border-b border-dashed">
              {fila.map((celda, j) => (
                <td key={j} className="py-1 pr-4">
                  {celda}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

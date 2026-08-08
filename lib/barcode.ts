import JsBarcode from "jsbarcode";

// Generación de códigos de barras internos (RF-1.5): cuando un producto no trae uno de fábrica
// (típico en panadería), se le asigna uno acá. Prefijo "20"–"29": rango que GS1 reserva para
// uso interno de un comercio, así nunca colisiona con el código real de un producto de fábrica.
// Formato EAN-13 completo (con dígito verificador) para que ya sea válido cuando se imprima en
// una etiqueta escaneable (docs/backlog/10-etiquetas.md).
export function generarCodigoBarrasInterno(): string {
  const prefijo = "20";
  const cuerpo = Array.from({ length: 10 }, () => Math.floor(Math.random() * 10)).join("");
  const codigo12 = prefijo + cuerpo;
  return codigo12 + calcularDigitoVerificadorEan13(codigo12);
}

function calcularDigitoVerificadorEan13(codigo12Digitos: string): string {
  const digitos = codigo12Digitos.split("").map(Number);
  const suma = digitos.reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 1 : 3), 0);
  return String((10 - (suma % 10)) % 10);
}

// E10-4: dibuja el código de barras del producto sobre un <svg>. CODE128 en vez de EAN-13 --
// codigo_barras puede haber sido cargado a mano con cualquier formato (no solo los generados
// acá arriba), y CODE128 acepta cualquier texto sin validar longitud/checksum.
export function renderizarCodigoBarras(svg: SVGSVGElement, valor: string) {
  JsBarcode(svg, valor, {
    format: "CODE128",
    width: 1.5,
    height: 40,
    fontSize: 12,
    margin: 0,
  });
}

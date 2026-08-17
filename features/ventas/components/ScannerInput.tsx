"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { useBuscarProducto } from "@/features/productos/hooks/useBuscarProducto";
import type { Producto } from "@/repositories/productosRepository";
import { formatearMoneda } from "@/lib/format";

// E7-4: un único input cumple dos roles — recibe el lector de código de barras USB (que
// escribe rápido y termina con Enter, como si fuera un teclado) y sirve de búsqueda manual por
// nombre (sugerencias en vivo mientras se tipea más lento). `disabled` lo usa el padre para
// dejar de pelear por el foco mientras hay un diálogo abierto (ej. pedir el peso).
export function ScannerInput({
  onSeleccionar,
  disabled = false,
}: {
  onSeleccionar: (producto: Producto) => void;
  disabled?: boolean;
}) {
  const [valor, setValor] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { buscarPorCodigo, buscarPorTexto, resultados } = useBuscarProducto();

  useEffect(() => {
    if (!disabled) inputRef.current?.focus();
  }, [disabled]);

  useEffect(() => {
    const texto = valor.trim();
    if (texto.length < 2) return;
    const timeout = setTimeout(() => buscarPorTexto(texto), 200);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valor]);

  async function procesarCodigo() {
    if (!valor.trim()) return;
    const codigo = valor.trim();
    setError(null);
    const producto = await buscarPorCodigo(codigo);
    if (producto) {
      onSeleccionar(producto);
      setValor("");
    } else {
      setError(`No se encontró ningún producto con el código "${codigo}".`);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    // preventDefault corta el submit implícito que dispara el propio <form> de abajo -- si no,
    // en desktop este handler y handleSubmit correrían los dos para la misma tecla Enter.
    e.preventDefault();
    procesarCodigo();
  }

  // En mobile, el input no tenía ningún <form> propio -- el navegador lo trataba como parte de
  // un único formulario implícito junto con TODOS los inputs de la pantalla (cantidad de cada
  // renglón del carrito incluidos), así que el teclado virtual mostraba "Siguiente" en vez de
  // "Ir"/"Buscar" y, al tocarlo, saltaba el foco al primer input de cantidad del carrito sin
  // disparar ningún Enter real (handleKeyDown nunca corría). Envolver el input en su propio
  // <form> lo aísla de esa navegación: el teclado pasa a mostrar "Ir"/"Buscar" y tocarlo dispara
  // submit acá, que hace exactamente lo mismo que Enter en desktop.
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    procesarCodigo();
  }

  function handleSeleccionarSugerencia(producto: Producto) {
    onSeleccionar(producto);
    setValor("");
    setError(null);
    inputRef.current?.focus();
  }

  return (
    <div className="relative">
      <form onSubmit={handleSubmit}>
        <Input
          ref={inputRef}
          disabled={disabled}
          placeholder="Escanear código de barras o buscar por nombre..."
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          onKeyDown={handleKeyDown}
          enterKeyHint="search"
        />
      </form>
      {error && <p className="mt-1 text-sm text-destructive">{error}</p>}
      {resultados.length > 0 && valor.trim().length >= 2 && (
        <ul className="absolute z-10 mt-1 w-full rounded-lg border bg-popover shadow-md">
          {resultados.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                onClick={() => handleSeleccionarSugerencia(p)}
              >
                {p.nombre} — {formatearMoneda(p.precio)}
                {p.tipo_venta === "peso" ? "/kg" : ""}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

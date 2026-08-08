"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { generarLoteEtiquetas, type ResultadoGenerarLote } from "@/repositories/etiquetasRepository";
import { getErrorMessage } from "@/lib/errors";

export function useGenerarLote() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function generar(input: {
    productoId: string;
    cantidad: number;
    fechaVencimiento: string | null;
  }): Promise<ResultadoGenerarLote | null> {
    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      return await generarLoteEtiquetas(supabase, input);
    } catch (err) {
      setError(getErrorMessage(err, "No se pudo generar el lote de etiquetas"));
      return null;
    } finally {
      setIsLoading(false);
    }
  }

  return { generar, error, isLoading };
}

"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  registrarMerma,
  type ResultadoMovimientoStock,
} from "@/repositories/movimientosStockRepository";
import { getErrorMessage } from "@/lib/errors";

export function useRegistrarMerma() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function registrar(input: {
    productoId: string;
    cantidad: number;
    motivo: string;
  }): Promise<ResultadoMovimientoStock | null> {
    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      return await registrarMerma(supabase, input);
    } catch (err) {
      setError(getErrorMessage(err, "No se pudo registrar la merma"));
      return null;
    } finally {
      setIsLoading(false);
    }
  }

  return { registrar, error, isLoading };
}

"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  registrarConsumoInterno,
  type ResultadoMovimientoStock,
} from "@/repositories/movimientosStockRepository";
import { getErrorMessage } from "@/lib/errors";

export function useRegistrarConsumoInterno() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function registrar(input: {
    productoId: string;
    cantidad: number;
    empleadoId: string | null;
    motivo: string;
  }): Promise<ResultadoMovimientoStock | null> {
    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      return await registrarConsumoInterno(supabase, input);
    } catch (err) {
      setError(getErrorMessage(err, "No se pudo registrar el consumo interno"));
      return null;
    } finally {
      setIsLoading(false);
    }
  }

  return { registrar, error, isLoading };
}

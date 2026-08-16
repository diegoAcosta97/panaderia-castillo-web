"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  crearIngresoMercaderia,
  type IngresoMercaderiaItemInput,
  type ResultadoIngresoMercaderia,
} from "@/repositories/ingresoMercaderiaRepository";
import { getErrorMessage } from "@/lib/errors";

export function useRegistrarIngresoMercaderia() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function registrar(
    items: IngresoMercaderiaItemInput[],
    observaciones: string,
  ): Promise<ResultadoIngresoMercaderia | null> {
    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      return await crearIngresoMercaderia(supabase, items, observaciones.trim() || null);
    } catch (err) {
      setError(getErrorMessage(err, "No se pudo registrar el ingreso de mercadería"));
      return null;
    } finally {
      setIsLoading(false);
    }
  }

  return { registrar, error, isLoading };
}

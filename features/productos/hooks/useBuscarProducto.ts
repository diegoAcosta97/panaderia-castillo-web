"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { buscarPorCodigoBarras, buscarPorNombre } from "@/repositories/productosRepository";
import type { Producto } from "@/repositories/productosRepository";

// Único punto de búsqueda de producto, reutilizado por el punto de venta (EPIC 7, lector de
// código de barras USB) y por etiquetas (EPIC 10). Ver docs/backlog/03-productos.md#E3-7.
export function useBuscarProducto() {
  const [resultados, setResultados] = useState<Producto[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  async function buscarPorCodigo(codigoBarras: string): Promise<Producto | null> {
    setIsLoading(true);
    try {
      const supabase = createClient();
      return await buscarPorCodigoBarras(supabase, codigoBarras);
    } finally {
      setIsLoading(false);
    }
  }

  async function buscarPorTexto(texto: string): Promise<Producto[]> {
    setIsLoading(true);
    try {
      const supabase = createClient();
      const data = await buscarPorNombre(supabase, texto);
      setResultados(data);
      return data;
    } finally {
      setIsLoading(false);
    }
  }

  return { resultados, isLoading, buscarPorCodigo, buscarPorTexto };
}

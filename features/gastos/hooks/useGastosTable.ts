"use client";

import { useCallback, useEffect, useState } from "react";
import type { SortingState } from "@tanstack/react-table";
import { createClient } from "@/lib/supabase/client";
import { useRefetchOnReturn } from "@/hooks/useRefetchOnReturn";
import { listGastosPaginated, sumaGastosFiltrados } from "@/repositories/gastosRepository";
import type { Gasto } from "@/repositories/gastosRepository";

const PAGE_SIZE = 20;

export function useGastosTable() {
  const [pageIndex, setPageIndex] = useState(0);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [proveedorId, setProveedorIdState] = useState("");
  const [desde, setDesdeState] = useState("");
  const [hasta, setHastaState] = useState("");
  const [data, setData] = useState<Gasto[]>([]);
  const [count, setCount] = useState(0);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      const sort = sorting[0]
        ? { column: sorting[0].id, ascending: !sorting[0].desc }
        : undefined;
      const filtros = {
        proveedorId: proveedorId || undefined,
        desde: desde || undefined,
        hasta: hasta || undefined,
      };
      const [result, sumaTotal] = await Promise.all([
        listGastosPaginated(supabase, { page: pageIndex, pageSize: PAGE_SIZE, ...filtros, sort }),
        sumaGastosFiltrados(supabase, filtros),
      ]);
      setData(result.data);
      setCount(result.count);
      setTotal(sumaTotal);
    } finally {
      setIsLoading(false);
    }
  }, [pageIndex, sorting, proveedorId, desde, hasta]);

  useEffect(() => {
    Promise.resolve().then(() => fetchData());
  }, [fetchData]);

  useRefetchOnReturn(fetchData);

  // Cambiar un filtro mientras se está en, por ejemplo, la página 3 del resultado anterior
  // dejaría una página vacía o con datos de otro conjunto -- siempre se vuelve a la primera.
  function setProveedorId(value: string) {
    setProveedorIdState(value);
    setPageIndex(0);
  }

  function setDesde(value: string) {
    setDesdeState(value);
    setPageIndex(0);
  }

  function setHasta(value: string) {
    setHastaState(value);
    setPageIndex(0);
  }

  return {
    data,
    count,
    total,
    isLoading,
    pageIndex,
    pageSize: PAGE_SIZE,
    setPageIndex,
    sorting,
    setSorting,
    proveedorId,
    setProveedorId,
    desde,
    setDesde,
    hasta,
    setHasta,
    refetch: fetchData,
  };
}

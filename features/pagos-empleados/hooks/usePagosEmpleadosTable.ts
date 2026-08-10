"use client";

import { useCallback, useEffect, useState } from "react";
import type { SortingState } from "@tanstack/react-table";
import { createClient } from "@/lib/supabase/client";
import {
  listPagosEmpleadosPaginated,
  sumaPagosEmpleadosFiltrados,
} from "@/repositories/pagosEmpleadosRepository";
import type { PagoEmpleado } from "@/repositories/pagosEmpleadosRepository";

const PAGE_SIZE = 20;

export function usePagosEmpleadosTable() {
  const [pageIndex, setPageIndex] = useState(0);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [empleadoId, setEmpleadoIdState] = useState("");
  const [desde, setDesdeState] = useState("");
  const [hasta, setHastaState] = useState("");
  const [data, setData] = useState<PagoEmpleado[]>([]);
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
        empleadoId: empleadoId || undefined,
        desde: desde || undefined,
        hasta: hasta || undefined,
      };
      const [result, sumaTotal] = await Promise.all([
        listPagosEmpleadosPaginated(supabase, {
          page: pageIndex,
          pageSize: PAGE_SIZE,
          ...filtros,
          sort,
        }),
        sumaPagosEmpleadosFiltrados(supabase, filtros),
      ]);
      setData(result.data);
      setCount(result.count);
      setTotal(sumaTotal);
    } finally {
      setIsLoading(false);
    }
  }, [pageIndex, sorting, empleadoId, desde, hasta]);

  useEffect(() => {
    Promise.resolve().then(() => fetchData());
  }, [fetchData]);

  function setEmpleadoId(value: string) {
    setEmpleadoIdState(value);
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
    empleadoId,
    setEmpleadoId,
    desde,
    setDesde,
    hasta,
    setHasta,
    refetch: fetchData,
  };
}

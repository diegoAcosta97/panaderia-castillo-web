"use client";

import { useCallback, useEffect, useState } from "react";
import type { SortingState } from "@tanstack/react-table";
import { createClient } from "@/lib/supabase/client";
import { useRefetchOnReturn } from "@/hooks/useRefetchOnReturn";
import { listProduccionesPaginated } from "@/repositories/produccionRepository";
import type { Produccion } from "@/repositories/produccionRepository";
import type { EstadoProduccion } from "@/types/database";

const PAGE_SIZE = 20;
const TODOS = "__todos__";

export function useProduccionesTable() {
  const [pageIndex, setPageIndex] = useState(0);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [estado, setEstadoState] = useState<string>("pendiente");
  const [data, setData] = useState<Produccion[]>([]);
  const [count, setCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      const sort = sorting[0]
        ? { column: sorting[0].id, ascending: !sorting[0].desc }
        : undefined;
      const result = await listProduccionesPaginated(supabase, {
        page: pageIndex,
        pageSize: PAGE_SIZE,
        estado: estado === TODOS ? undefined : (estado as EstadoProduccion),
        sort,
      });
      setData(result.data);
      setCount(result.count);
    } finally {
      setIsLoading(false);
    }
  }, [pageIndex, sorting, estado]);

  useEffect(() => {
    Promise.resolve().then(() => fetchData());
  }, [fetchData]);

  useRefetchOnReturn(fetchData);

  function setEstado(value: string) {
    setEstadoState(value);
    setPageIndex(0);
  }

  return {
    data,
    count,
    isLoading,
    pageIndex,
    pageSize: PAGE_SIZE,
    setPageIndex,
    sorting,
    setSorting,
    estado,
    setEstado,
    todosValue: TODOS,
    refetch: fetchData,
  };
}

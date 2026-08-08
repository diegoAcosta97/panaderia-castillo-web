"use client";

import { useCallback, useEffect, useState } from "react";
import type { SortingState } from "@tanstack/react-table";
import { createClient } from "@/lib/supabase/client";
import { listTurnosPaginated } from "@/repositories/cajaTurnosRepository";
import type { CajaTurno } from "@/repositories/cajaTurnosRepository";

const PAGE_SIZE = 20;

export function useCajaTurnosTable() {
  const [pageIndex, setPageIndex] = useState(0);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [desde, setDesdeState] = useState("");
  const [hasta, setHastaState] = useState("");
  const [data, setData] = useState<CajaTurno[]>([]);
  const [count, setCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      const sort = sorting[0]
        ? { column: sorting[0].id, ascending: !sorting[0].desc }
        : undefined;
      const result = await listTurnosPaginated(supabase, {
        page: pageIndex,
        pageSize: PAGE_SIZE,
        desde: desde || undefined,
        hasta: hasta || undefined,
        sort,
      });
      setData(result.data);
      setCount(result.count);
    } finally {
      setIsLoading(false);
    }
  }, [pageIndex, sorting, desde, hasta]);

  useEffect(() => {
    Promise.resolve().then(() => fetchData());
  }, [fetchData]);

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
    isLoading,
    pageIndex,
    pageSize: PAGE_SIZE,
    setPageIndex,
    sorting,
    setSorting,
    desde,
    setDesde,
    hasta,
    setHasta,
    refetch: fetchData,
  };
}

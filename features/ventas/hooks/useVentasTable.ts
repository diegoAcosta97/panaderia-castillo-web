"use client";

import { useCallback, useEffect, useState } from "react";
import type { SortingState } from "@tanstack/react-table";
import { createClient } from "@/lib/supabase/client";
import { listVentasPaginated } from "@/repositories/ventasRepository";
import type { Venta } from "@/repositories/ventasRepository";

const PAGE_SIZE = 20;

export function useVentasTable() {
  const [pageIndex, setPageIndex] = useState(0);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [cajaTurnoId, setCajaTurnoIdState] = useState("");
  const [desde, setDesdeState] = useState("");
  const [hasta, setHastaState] = useState("");
  const [data, setData] = useState<Venta[]>([]);
  const [count, setCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      const sort = sorting[0]
        ? { column: sorting[0].id, ascending: !sorting[0].desc }
        : undefined;
      const result = await listVentasPaginated(supabase, {
        page: pageIndex,
        pageSize: PAGE_SIZE,
        cajaTurnoId: cajaTurnoId || undefined,
        desde: desde || undefined,
        hasta: hasta || undefined,
        sort,
      });
      setData(result.data);
      setCount(result.count);
    } finally {
      setIsLoading(false);
    }
  }, [pageIndex, sorting, cajaTurnoId, desde, hasta]);

  useEffect(() => {
    Promise.resolve().then(() => fetchData());
  }, [fetchData]);

  function setCajaTurnoId(value: string) {
    setCajaTurnoIdState(value);
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
    isLoading,
    pageIndex,
    pageSize: PAGE_SIZE,
    setPageIndex,
    sorting,
    setSorting,
    cajaTurnoId,
    setCajaTurnoId,
    desde,
    setDesde,
    hasta,
    setHasta,
    refetch: fetchData,
  };
}

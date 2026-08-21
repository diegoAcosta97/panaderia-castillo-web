"use client";

import { useCallback, useEffect, useState } from "react";
import type { SortingState } from "@tanstack/react-table";
import { createClient } from "@/lib/supabase/client";
import { useRefetchOnReturn } from "@/hooks/useRefetchOnReturn";
import { listMovimientosStockPaginated } from "@/repositories/movimientosStockRepository";
import type { MovimientoStock } from "@/repositories/movimientosStockRepository";
import type { TipoMovimientoStock } from "@/types/database";

const PAGE_SIZE = 20;
const TODOS = "__todos__";

export function useMovimientosStockTable() {
  const [pageIndex, setPageIndex] = useState(0);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [tipo, setTipoState] = useState(TODOS);
  const [productoId, setProductoIdState] = useState("");
  const [desde, setDesdeState] = useState("");
  const [hasta, setHastaState] = useState("");
  const [data, setData] = useState<MovimientoStock[]>([]);
  const [count, setCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      const sort = sorting[0]
        ? { column: sorting[0].id, ascending: !sorting[0].desc }
        : undefined;
      const result = await listMovimientosStockPaginated(supabase, {
        page: pageIndex,
        pageSize: PAGE_SIZE,
        tipo: tipo === TODOS ? undefined : (tipo as TipoMovimientoStock),
        productoId: productoId || undefined,
        desde: desde || undefined,
        hasta: hasta || undefined,
        sort,
      });
      setData(result.data);
      setCount(result.count);
    } finally {
      setIsLoading(false);
    }
  }, [pageIndex, sorting, tipo, productoId, desde, hasta]);

  useEffect(() => {
    Promise.resolve().then(() => fetchData());
  }, [fetchData]);

  useRefetchOnReturn(fetchData);

  function setTipo(value: string) {
    setTipoState(value);
    setPageIndex(0);
  }

  function setProductoId(value: string) {
    setProductoIdState(value);
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
    tipo,
    setTipo,
    todosValue: TODOS,
    productoId,
    setProductoId,
    desde,
    setDesde,
    hasta,
    setHasta,
  };
}

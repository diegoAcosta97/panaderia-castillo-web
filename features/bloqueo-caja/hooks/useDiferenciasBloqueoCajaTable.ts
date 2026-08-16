"use client";

import { useCallback, useEffect, useState } from "react";
import type { SortingState } from "@tanstack/react-table";
import { createClient } from "@/lib/supabase/client";
import { listBloqueoCajaDiferenciasPaginated } from "@/repositories/bloqueoCajaRepository";
import type { BloqueoCajaDiferencia } from "@/repositories/bloqueoCajaRepository";

const PAGE_SIZE = 20;
const TODAS = "__todas__";

export function useDiferenciasBloqueoCajaTable() {
  const [pageIndex, setPageIndex] = useState(0);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [productoId, setProductoIdState] = useState(TODAS);
  const [categoriaId, setCategoriaIdState] = useState(TODAS);
  const [desde, setDesdeState] = useState("");
  const [hasta, setHastaState] = useState("");
  const [data, setData] = useState<BloqueoCajaDiferencia[]>([]);
  const [count, setCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      const sort = sorting[0]
        ? { column: sorting[0].id, ascending: !sorting[0].desc }
        : undefined;
      const result = await listBloqueoCajaDiferenciasPaginated(supabase, {
        page: pageIndex,
        pageSize: PAGE_SIZE,
        sort,
        productoId: productoId === TODAS ? undefined : productoId,
        categoriaId: categoriaId === TODAS ? undefined : categoriaId,
        desde: desde || undefined,
        hasta: hasta || undefined,
      });
      setData(result.data);
      setCount(result.count);
    } finally {
      setIsLoading(false);
    }
  }, [pageIndex, sorting, productoId, categoriaId, desde, hasta]);

  useEffect(() => {
    Promise.resolve().then(() => fetchData());
  }, [fetchData]);

  function setProductoId(value: string) {
    setProductoIdState(value);
    setPageIndex(0);
  }

  function setCategoriaId(value: string) {
    setCategoriaIdState(value);
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
    productoId,
    setProductoId,
    categoriaId,
    setCategoriaId,
    todasValue: TODAS,
    desde,
    setDesde,
    hasta,
    setHasta,
  };
}

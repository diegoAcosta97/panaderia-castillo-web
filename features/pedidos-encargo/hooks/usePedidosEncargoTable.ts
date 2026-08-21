"use client";

import { useCallback, useEffect, useState } from "react";
import type { SortingState } from "@tanstack/react-table";
import { createClient } from "@/lib/supabase/client";
import { useRefetchOnReturn } from "@/hooks/useRefetchOnReturn";
import { listPedidosEncargoPaginated } from "@/repositories/pedidosEncargoRepository";
import type { PedidoEncargoConDetalle } from "@/repositories/pedidosEncargoRepository";
import type { EstadoPedidoEncargo } from "@/types/database";

const PAGE_SIZE = 20;
const TODOS = "__todos__";

export function usePedidosEncargoTable() {
  const [pageIndex, setPageIndex] = useState(0);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [estado, setEstadoState] = useState<string>("pendiente");
  const [texto, setTextoState] = useState("");
  const [data, setData] = useState<PedidoEncargoConDetalle[]>([]);
  const [count, setCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      const sort = sorting[0]
        ? { column: sorting[0].id, ascending: !sorting[0].desc }
        : undefined;
      const result = await listPedidosEncargoPaginated(supabase, {
        page: pageIndex,
        pageSize: PAGE_SIZE,
        estado: estado === TODOS ? undefined : (estado as EstadoPedidoEncargo),
        texto: texto || undefined,
        sort,
      });
      setData(result.data);
      setCount(result.count);
    } finally {
      setIsLoading(false);
    }
  }, [pageIndex, sorting, estado, texto]);

  useEffect(() => {
    Promise.resolve().then(() => fetchData());
  }, [fetchData]);

  useRefetchOnReturn(fetchData);

  function setEstado(value: string) {
    setEstadoState(value);
    setPageIndex(0);
  }

  function setTexto(value: string) {
    setTextoState(value);
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
    texto,
    setTexto,
    refetch: fetchData,
  };
}

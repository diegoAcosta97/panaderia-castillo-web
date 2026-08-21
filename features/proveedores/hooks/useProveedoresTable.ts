"use client";

import { useCallback, useEffect, useState } from "react";
import type { SortingState } from "@tanstack/react-table";
import { createClient } from "@/lib/supabase/client";
import { useRefetchOnReturn } from "@/hooks/useRefetchOnReturn";
import { listProveedoresPaginated } from "@/repositories/proveedoresRepository";
import type { Proveedor } from "@/repositories/proveedoresRepository";

const PAGE_SIZE = 20;

export function useProveedoresTable() {
  const [pageIndex, setPageIndex] = useState(0);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [data, setData] = useState<Proveedor[]>([]);
  const [count, setCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      const sort = sorting[0]
        ? { column: sorting[0].id, ascending: !sorting[0].desc }
        : undefined;
      const result = await listProveedoresPaginated(supabase, {
        page: pageIndex,
        pageSize: PAGE_SIZE,
        sort,
      });
      setData(result.data);
      setCount(result.count);
    } finally {
      setIsLoading(false);
    }
  }, [pageIndex, sorting]);

  useEffect(() => {
    Promise.resolve().then(() => fetchData());
  }, [fetchData]);

  useRefetchOnReturn(fetchData);

  return {
    data,
    count,
    isLoading,
    pageIndex,
    pageSize: PAGE_SIZE,
    setPageIndex,
    sorting,
    setSorting,
    refetch: fetchData,
  };
}

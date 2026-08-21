"use client";

import { useCallback, useEffect, useState } from "react";
import type { SortingState } from "@tanstack/react-table";
import { createClient } from "@/lib/supabase/client";
import { useRefetchOnReturn } from "@/hooks/useRefetchOnReturn";
import { listProductosPaginated } from "@/repositories/productosRepository";
import type { Producto } from "@/repositories/productosRepository";

const PAGE_SIZE = 20;
const TODAS = "__todas__";
const TODOS_ACTIVO = "__todos__";
const DEBOUNCE_NOMBRE_MS = 300;

export function useProductosTable() {
  const [pageIndex, setPageIndex] = useState(0);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [categoriaId, setCategoriaIdState] = useState(TODAS);
  const [activo, setActivoState] = useState(TODOS_ACTIVO);
  const [nombreInput, setNombreInput] = useState("");
  const [nombre, setNombre] = useState("");
  const [data, setData] = useState<Producto[]>([]);
  const [count, setCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Debounce: la búsqueda solo dispara la query 300ms después de que el usuario deja de tipear.
  useEffect(() => {
    const timeout = setTimeout(() => {
      setNombre(nombreInput);
      setPageIndex(0);
    }, DEBOUNCE_NOMBRE_MS);
    return () => clearTimeout(timeout);
  }, [nombreInput]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      const sort = sorting[0]
        ? { column: sorting[0].id, ascending: !sorting[0].desc }
        : undefined;
      const result = await listProductosPaginated(supabase, {
        page: pageIndex,
        pageSize: PAGE_SIZE,
        sort,
        categoriaId: categoriaId === TODAS ? undefined : categoriaId,
        nombre: nombre || undefined,
        activo: activo === TODOS_ACTIVO ? undefined : activo === "true",
      });
      setData(result.data);
      setCount(result.count);
    } finally {
      setIsLoading(false);
    }
  }, [pageIndex, sorting, categoriaId, nombre, activo]);

  useEffect(() => {
    Promise.resolve().then(() => fetchData());
  }, [fetchData]);

  useRefetchOnReturn(fetchData);

  function setCategoriaId(value: string) {
    setCategoriaIdState(value);
    setPageIndex(0);
  }

  function setActivo(value: string) {
    setActivoState(value);
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
    categoriaId,
    setCategoriaId,
    todasValue: TODAS,
    activo,
    setActivo,
    todosActivoValue: TODOS_ACTIVO,
    nombreInput,
    setNombreInput,
    refetch: fetchData,
  };
}

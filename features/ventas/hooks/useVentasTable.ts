"use client";

import { useCallback, useEffect, useState } from "react";
import type { SortingState } from "@tanstack/react-table";
import { createClient } from "@/lib/supabase/client";
import {
  listVentasPaginated,
  resumenVentasFiltro,
  type ResumenVentasFiltro,
} from "@/repositories/ventasRepository";
import type { Venta } from "@/repositories/ventasRepository";
import type { MedioPago } from "@/types/database";

const PAGE_SIZE = 20;

// `cajaTurnoIdFijo`: vendedor en /pos/ventas -- solo puede ver la caja abierta (RF del dueño),
// arranca con ese filtro ya puesto. VentasTable no renderiza los controles para cambiarlo en ese
// caso, pero el estado sigue siendo editable acá adentro por si en el futuro hace falta.
export function useVentasTable(opciones?: { cajaTurnoIdFijo?: string }) {
  const [pageIndex, setPageIndex] = useState(0);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [cajaTurnoId, setCajaTurnoIdState] = useState(opciones?.cajaTurnoIdFijo ?? "");
  const [desde, setDesdeState] = useState("");
  const [hasta, setHastaState] = useState("");
  const [medioPago, setMedioPagoState] = useState<MedioPago | "">("");
  const [data, setData] = useState<Venta[]>([]);
  const [count, setCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [resumen, setResumen] = useState<ResumenVentasFiltro | null>(null);
  const [resumenLoading, setResumenLoading] = useState(false);

  const hayFiltro = !!(cajaTurnoId || desde || hasta || medioPago);

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
        medioPago: medioPago || undefined,
        sort,
      });
      setData(result.data);
      setCount(result.count);
    } finally {
      setIsLoading(false);
    }
  }, [pageIndex, sorting, cajaTurnoId, desde, hasta, medioPago]);

  useEffect(() => {
    Promise.resolve().then(() => fetchData());
  }, [fetchData]);

  // Independiente de la paginación/orden: el total del pie de tabla es sobre todo el filtro, no
  // solo la página visible (E7-10, docs/backlog/07-punto-de-venta.md).
  const fetchResumen = useCallback(async () => {
    if (!hayFiltro) {
      setResumen(null);
      return;
    }
    setResumenLoading(true);
    try {
      const supabase = createClient();
      const result = await resumenVentasFiltro(supabase, {
        cajaTurnoId: cajaTurnoId || undefined,
        desde: desde || undefined,
        hasta: hasta || undefined,
        medioPago: medioPago || undefined,
      });
      setResumen(result);
    } finally {
      setResumenLoading(false);
    }
  }, [cajaTurnoId, desde, hasta, medioPago, hayFiltro]);

  useEffect(() => {
    Promise.resolve().then(() => fetchResumen());
  }, [fetchResumen]);

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

  function setMedioPago(value: MedioPago | "") {
    setMedioPagoState(value);
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
    medioPago,
    setMedioPago,
    hayFiltro,
    resumen,
    resumenLoading,
    refetch: fetchData,
  };
}

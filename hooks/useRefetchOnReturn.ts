"use client";

import { useEffect, useRef } from "react";

/**
 * Los listados traen sus filas directo desde Supabase en el cliente, fuera del
 * cache de Next. Al volver a la pantalla (botón atrás, cambio de pestaña, o
 * volver a foco) Next puede reutilizar la instancia ya montada de la tabla sin
 * rehacer el fetch inicial, mostrando datos desactualizados tras editar un
 * registro. Este hook fuerza un refetch cada vez que el usuario vuelve.
 */
export function useRefetchOnReturn(refetch: () => void) {
  const refetchRef = useRef(refetch);

  useEffect(() => {
    refetchRef.current = refetch;
  }, [refetch]);

  useEffect(() => {
    function handleReturn() {
      refetchRef.current();
    }
    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        handleReturn();
      }
    }
    window.addEventListener("popstate", handleReturn);
    window.addEventListener("focus", handleReturn);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener("popstate", handleReturn);
      window.removeEventListener("focus", handleReturn);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);
}

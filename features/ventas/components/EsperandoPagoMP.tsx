"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { cancelarPagoMPPendiente } from "@/features/mercadopago/actions";
import { getErrorMessage } from "@/lib/errors";

const INTERVALO_POLLING_MS = 3000;

// E8-4: mientras la venta está pendiente_pago, hace polling contra Supabase (no contra la API
// de Mercado Pago directamente -- eso lo hace el webhook, E8-3) y avanza sola cuando el estado
// pasa a completada. Desde la migración a QR estático (docs/backlog/08-mercadopago.md#E8-2) no
// hay nada para renderizar acá: el QR es el cartel fijo pegado en el mostrador, no una imagen
// por venta -- esta pantalla es solo el estado interno del cajero.
export function EsperandoPagoMP({
  ventaId,
  onConfirmada,
  onCancelar,
}: {
  ventaId: string;
  onConfirmada: (ventaId: string, numeroComprobante: number) => void;
  onCancelar: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [cancelando, setCancelando] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let activo = true;

    async function chequear() {
      const { data, error } = await supabase
        .from("ventas")
        .select("estado, numero_comprobante")
        .eq("id", ventaId)
        .single();

      if (!activo) return;
      if (error) {
        setError(getErrorMessage(error, "No se pudo consultar el estado de la venta"));
        return;
      }
      if (data.estado === "completada") {
        onConfirmada(ventaId, data.numero_comprobante);
      }
    }

    chequear();
    const interval = setInterval(chequear, INTERVALO_POLLING_MS);

    return () => {
      activo = false;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ventaId]);

  async function handleCancelar() {
    setCancelando(true);
    setError(null);
    try {
      await cancelarPagoMPPendiente(ventaId);
      onCancelar();
    } catch (err) {
      setError(getErrorMessage(err, "No se pudo cancelar el cobro"));
      setCancelando(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-4 p-6 text-center">
      <h2 className="text-xl font-semibold">Esperando el pago...</h2>
      <p className="max-w-sm text-sm text-muted-foreground">
        Decile al cliente que escanee el QR fijo de la caja con la app de Mercado Pago. Esta
        pantalla avanza sola apenas se acredite el pago.
      </p>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="button" variant="outline" onClick={handleCancelar} disabled={cancelando}>
        <X className="size-4" />
        {cancelando ? "Cancelando..." : "Cancelar cobro"}
      </Button>
    </div>
  );
}

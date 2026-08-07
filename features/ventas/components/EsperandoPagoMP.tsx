"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { QrMercadoPago } from "@/features/ventas/components/QrMercadoPago";
import { getErrorMessage } from "@/lib/errors";

const INTERVALO_POLLING_MS = 3000;

// E8-4: mientras la venta está pendiente_pago, hace polling contra Supabase (no contra la API
// de Mercado Pago directamente -- eso lo hace el webhook, E8-3) y avanza sola cuando el estado
// pasa a completada.
export function EsperandoPagoMP({
  ventaId,
  qrData,
  onConfirmada,
  onCancelar,
}: {
  ventaId: string;
  qrData: string;
  onConfirmada: (numeroComprobante: number) => void;
  onCancelar: () => void;
}) {
  const [error, setError] = useState<string | null>(null);

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
        onConfirmada(data.numero_comprobante);
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

  return (
    <div className="flex flex-col items-center gap-4 p-6 text-center">
      <h2 className="text-xl font-semibold">Esperando el pago...</h2>
      <QrMercadoPago qrData={qrData} />
      <p className="max-w-sm text-sm text-muted-foreground">
        El cliente escanea este código con la app de Mercado Pago. Esta pantalla avanza sola
        apenas se acredite el pago.
      </p>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="button" variant="outline" onClick={onCancelar}>
        Volver
      </Button>
    </div>
  );
}

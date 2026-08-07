"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function QrMercadoPago({ qrData }: { qrData: string }) {
  const [imagenUrl, setImagenUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    QRCode.toDataURL(qrData, { width: 280, margin: 1 }).then((url) => {
      if (!cancelado) setImagenUrl(url);
    });
    return () => {
      cancelado = true;
    };
  }, [qrData]);

  if (!imagenUrl) {
    return <p className="text-sm text-muted-foreground">Generando QR...</p>;
  }

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={imagenUrl} alt="Código QR de Mercado Pago" width={280} height={280} />;
}

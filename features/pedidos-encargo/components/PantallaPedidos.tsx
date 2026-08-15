"use client";

import { useState } from "react";
import { NuevoPedidoForm } from "@/features/pedidos-encargo/components/NuevoPedidoForm";
import { PedidosEncargoTable } from "@/features/pedidos-encargo/components/PedidosEncargoTable";
import type { Producto } from "@/repositories/productosRepository";

export function PantallaPedidos({ productos }: { productos: Producto[] }) {
  // Remonta la tabla (vuelve a pedir la primera página) tras crear un pedido -- más simple que
  // levantar el estado del hook de paginación un nivel más arriba para un caso de uso tan puntual.
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">Pedidos por encargo</h1>
      <NuevoPedidoForm onCreado={() => setRefreshKey((k) => k + 1)} />
      <PedidosEncargoTable key={refreshKey} productos={productos} />
    </div>
  );
}

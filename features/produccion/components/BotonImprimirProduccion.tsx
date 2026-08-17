"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { imprimir } from "@/lib/print";

export function BotonImprimirProduccion() {
  return (
    <Button type="button" variant="outline" onClick={imprimir} className="print:hidden">
      <Printer className="size-4" />
      Imprimir
    </Button>
  );
}

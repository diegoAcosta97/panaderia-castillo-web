import { FormularioIngresoMercaderia } from "@/features/ingreso-mercaderia/components/FormularioIngresoMercaderia";

// El layout de app/pos/(operacion) ya garantiza que haya un turno abierto para llegar acá
// (E4-2), mismo criterio que /pos/gastos y /pos/merma.
export default function IngresoMercaderiaPage() {
  return (
    <div className="flex flex-col gap-4 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Ingreso de mercadería</h1>
        <p className="text-muted-foreground max-w-md text-sm">
          Cargá los productos que llegaron y la cantidad de cada uno. Queda pendiente de
          aprobación de un administrador antes de sumarse al stock.
        </p>
      </div>
      <FormularioIngresoMercaderia />
    </div>
  );
}

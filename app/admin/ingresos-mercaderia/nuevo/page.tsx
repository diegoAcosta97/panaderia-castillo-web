import { FormularioIngresoMercaderia } from "@/features/ingreso-mercaderia/components/FormularioIngresoMercaderia";

export default function NuevoIngresoMercaderiaPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Nuevo ingreso de mercadería</h1>
        <p className="text-muted-foreground text-sm">
          Cargado por un administrador: se aplica al stock apenas lo registrás.
        </p>
      </div>
      <FormularioIngresoMercaderia />
    </div>
  );
}

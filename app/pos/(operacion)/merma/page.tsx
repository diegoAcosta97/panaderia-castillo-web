import { PantallaMerma } from "@/features/merma/components/PantallaMerma";

// El layout de app/pos/(operacion) ya garantiza que haya un turno abierto para llegar acá
// (E4-2), mismo criterio que /pos/gastos y /pos/etiquetas.
export default function MermaPage() {
  return <PantallaMerma />;
}

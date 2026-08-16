import { PantallaMerma } from "@/features/merma/components/PantallaMerma";

// registrar_merma no depende de un turno de caja abierto (E14-2) -- a diferencia de
// /pos/(operacion)/merma, esta página no necesita ese gate.
export default function MermaPage() {
  return <PantallaMerma />;
}

import { ChefHat } from "lucide-react";
import { getServerSession } from "@/features/auth/services/sessionService";

export default async function AdminHome() {
  const session = await getServerSession();

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
      <ChefHat className="size-10 text-primary" />
      <div>
        <p className="text-lg font-medium">
          Hola, {session?.perfil.nombre_completo || session?.perfil.email}
        </p>
        <p className="text-sm text-muted-foreground">
          Elegí una sección del menú para empezar.
        </p>
      </div>
    </div>
  );
}

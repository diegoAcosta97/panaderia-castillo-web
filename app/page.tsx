import { getServerSession } from "@/features/auth/services/sessionService";
import { LogoutButton } from "@/features/auth/components/LogoutButton";

// Placeholder temporal: acá todavía no hay nada que mostrar porque el proxy (E1-4) ya exige
// sesión para llegar a esta ruta, pero la redirección por rol a /admin o /pos recién se agrega
// en docs/backlog/02-roles.md#E2-1.
export default async function Home() {
  const session = await getServerSession();

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <div>
        <p className="text-lg font-medium">Sesión iniciada</p>
        <p className="text-muted-foreground text-sm">
          {session?.perfil.nombre_completo || session?.user.email} · {session?.rol}
        </p>
      </div>
      <LogoutButton />
    </div>
  );
}

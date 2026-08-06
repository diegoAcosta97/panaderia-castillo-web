import { redirect } from "next/navigation";
import { getServerSession } from "@/features/auth/services/sessionService";

// E2-2: guard de /admin/** por rol. El rol se resuelve server-side consultando `perfiles`
// (getServerSession), no vía JWT custom claims — mismo criterio que salus-web (ver
// docs/data-model.md).
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();

  if (!session) redirect("/login");
  if (session.rol !== "administrador") redirect("/pos");

  return <>{children}</>;
}

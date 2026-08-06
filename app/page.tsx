import { redirect } from "next/navigation";
import { getServerSession } from "@/features/auth/services/sessionService";

// El proxy (E1-4) ya garantiza que solo se llega acá con sesión — si por algún motivo no la
// hay, /login es un fallback razonable de todos modos.
export default async function Home() {
  const session = await getServerSession();
  redirect(session?.rol === "administrador" ? "/admin" : session ? "/pos" : "/login");
}

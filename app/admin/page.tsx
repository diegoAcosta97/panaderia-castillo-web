import Link from "next/link";
import { getServerSession } from "@/features/auth/services/sessionService";
import { LogoutButton } from "@/features/auth/components/LogoutButton";
import { buttonVariants } from "@/components/ui/button";

// Placeholder: el panel de administración real (productos, ofertas, caja, etc.) se arma a
// partir de EPIC 3 en adelante — esto solo prueba que el guard de /admin (E2-2) funciona.
export default async function AdminHome() {
  const session = await getServerSession();

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <div>
        <p className="text-lg font-medium">Panel de administración</p>
        <p className="text-muted-foreground text-sm">
          {session?.perfil.nombre_completo || session?.perfil.email} · {session?.rol}
        </p>
      </div>
      <div className="flex gap-2">
        <Link href="/admin/productos" className={buttonVariants({ variant: "outline" })}>
          Productos
        </Link>
        <Link href="/admin/usuarios" className={buttonVariants({ variant: "outline" })}>
          Usuarios
        </Link>
        <Link href="/admin/caja" className={buttonVariants({ variant: "outline" })}>
          Caja
        </Link>
        <Link href="/admin/proveedores" className={buttonVariants({ variant: "outline" })}>
          Proveedores
        </Link>
        <Link href="/admin/gastos" className={buttonVariants({ variant: "outline" })}>
          Gastos
        </Link>
      </div>
      <LogoutButton />
    </div>
  );
}

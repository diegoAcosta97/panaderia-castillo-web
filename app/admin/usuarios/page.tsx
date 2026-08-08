import { UsuariosTable } from "@/features/usuarios/components/UsuariosTable";

export default function UsuariosPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">Usuarios</h1>
      <UsuariosTable />
    </div>
  );
}

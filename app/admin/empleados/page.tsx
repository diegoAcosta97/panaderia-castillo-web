import { EmpleadosTable } from "@/features/empleados/components/EmpleadosTable";

export default function EmpleadosPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">Empleados</h1>
      <EmpleadosTable />
    </div>
  );
}

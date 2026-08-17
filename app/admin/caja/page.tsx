import { CajaTurnosTable } from "@/features/caja/components/CajaTurnosTable";

export default function CajaHistorialPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold print:hidden">Historial de caja</h1>
      <CajaTurnosTable />
    </div>
  );
}

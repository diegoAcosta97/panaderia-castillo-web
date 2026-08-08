import { ProveedoresTable } from "@/features/proveedores/components/ProveedoresTable";

export default function ProveedoresPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">Proveedores</h1>
      <ProveedoresTable />
    </div>
  );
}

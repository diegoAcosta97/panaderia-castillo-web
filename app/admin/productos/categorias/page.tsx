import { CategoriasTable } from "@/features/productos/components/CategoriasTable";

export default function CategoriasPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">Categorías</h1>
      <CategoriasTable />
    </div>
  );
}

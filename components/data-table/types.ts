import type { ColumnDef, SortingState } from "@tanstack/react-table";

export interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  isLoading?: boolean;
  emptyMessage?: string;

  // Paginado controlado por el servidor: el componente nunca pagina en el cliente, solo avisa
  // qué página quiere el usuario. El hook que lo use (ej. useProductosTable) es quien vuelve a
  // pedir los datos.
  pageIndex: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (pageIndex: number) => void;

  // Orden controlado por el servidor, mismo criterio que el paginado.
  sorting?: SortingState;
  onSortingChange?: (sorting: SortingState) => void;
}

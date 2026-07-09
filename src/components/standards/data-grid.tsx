import type { ReactNode } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DataGridColumn<T> {
  id: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  className?: string;
  width?: string;
}

export interface DataGridProps<T> {
  rows: T[];
  columns: DataGridColumn<T>[];
  getRowId: (row: T) => string;
  isLoading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  selectable?: boolean;
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
  pagination?: {
    limit: number;
    offset: number;
    total?: number | null;
    onOffset: (next: number) => void;
  };
}

export function DataGrid<T>({
  rows,
  columns,
  getRowId,
  isLoading,
  emptyMessage = "No records found.",
  onRowClick,
  selectable,
  selectedIds,
  onSelectionChange,
  pagination,
}: DataGridProps<T>) {
  const allSelected =
    selectable && rows.length > 0 && rows.every((r) => selectedIds?.has(getRowId(r)));

  const toggleAll = () => {
    if (!onSelectionChange) return;
    const next = new Set(selectedIds ?? []);
    if (allSelected) rows.forEach((r) => next.delete(getRowId(r)));
    else rows.forEach((r) => next.add(getRowId(r)));
    onSelectionChange(next);
  };

  const toggleOne = (id: string) => {
    if (!onSelectionChange) return;
    const next = new Set(selectedIds ?? []);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectionChange(next);
  };

  return (
    <div className="rounded-md border bg-card">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {selectable && (
                <TableHead className="w-10">
                  <Checkbox
                    checked={allSelected ?? false}
                    onCheckedChange={toggleAll}
                    aria-label="Select all"
                  />
                </TableHead>
              )}
              {columns.map((c) => (
                <TableHead key={c.id} className={c.className} style={c.width ? { width: c.width } : undefined}>
                  {c.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  {selectable && <TableCell><Skeleton className="h-4 w-4" /></TableCell>}
                  {columns.map((c) => (
                    <TableCell key={c.id}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length + (selectable ? 1 : 0)} className="text-center text-sm text-muted-foreground py-10">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => {
                const id = getRowId(row);
                return (
                  <TableRow
                    key={id}
                    className={cn(onRowClick && "cursor-pointer hover:bg-muted/40")}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                  >
                    {selectable && (
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedIds?.has(id) ?? false}
                          onCheckedChange={() => toggleOne(id)}
                          aria-label="Select row"
                        />
                      </TableCell>
                    )}
                    {columns.map((c) => (
                      <TableCell key={c.id} className={c.className}>{c.cell(row)}</TableCell>
                    ))}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
      {pagination && (
        <div className="flex items-center justify-between border-t p-3 text-sm">
          <div className="text-muted-foreground">
            {pagination.total != null
              ? `${pagination.offset + 1}–${Math.min(pagination.offset + rows.length, pagination.total)} of ${pagination.total}`
              : `Showing ${rows.length}`}
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="outline"
              disabled={pagination.offset === 0}
              onClick={() => pagination.onOffset(Math.max(0, pagination.offset - pagination.limit))}
            >
              <ChevronLeft className="h-4 w-4" /> Prev
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={
                pagination.total != null
                  ? pagination.offset + rows.length >= pagination.total
                  : rows.length < pagination.limit
              }
              onClick={() => pagination.onOffset(pagination.offset + pagination.limit)}
            >
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

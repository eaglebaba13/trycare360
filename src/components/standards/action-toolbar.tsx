import type { ReactNode } from "react";

export function ActionToolbar({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2">{children}</div>;
}

export function BulkActionsBar({
  count,
  onClear,
  children,
}: {
  count: number;
  onClear: () => void;
  children: ReactNode;
}) {
  if (count === 0) return null;
  return (
    <div className="flex items-center justify-between gap-2 rounded-md border bg-muted/40 p-2 pl-3 text-sm">
      <div>
        <span className="font-medium">{count}</span> selected
        <button className="ml-3 underline text-muted-foreground" onClick={onClear}>Clear</button>
      </div>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}

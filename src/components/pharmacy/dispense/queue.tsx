import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { listDispenses } from "@/lib/pharmacy/dispense.functions";
import { DataGrid } from "@/components/standards/data-grid";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

type DispenseRow = {
  id: string;
  dispense_number?: string | null;
  patient_id: string;
  encounter_id: string | null;
  warehouse_id: string;
  status: string;
  dispense_date: string;
  created_at: string;
};

export function DispenseQueue({ tenantId }: { tenantId: string }) {
  const [status, setStatus] = useState<string>("");
  const fn = useServerFn(listDispenses);
  const q = useQuery({
    queryKey: ["pharmacy-dispenses", tenantId, status],
    queryFn: () =>
      fn({
        data: {
          tenantId,
          status: status || null,
          limit: 100,
        } as never,
      }),
    enabled: !!tenantId,
  });
  const rows = ((q.data as { rows?: DispenseRow[] } | undefined)?.rows ?? []) as DispenseRow[];
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Filter status (posted, cancelled, pending)"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="max-w-xs"
        />
        <div className="ml-auto">
          <Link to="/pharmacy/dispense/$id" params={{ id: "new" }}>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" /> New dispense
            </Button>
          </Link>
        </div>
      </div>
      <DataGrid<DispenseRow>
        rows={rows}
        getRowId={(r) => r.id}
        isLoading={q.isLoading}
        emptyMessage="No dispenses in queue."
        columns={[
          {
            id: "no",
            header: "Dispense #",
            cell: (r) => (
              <Link
                to="/pharmacy/dispense/$id"
                params={{ id: r.id }}
                className="font-mono text-xs text-primary hover:underline"
              >
                {r.dispense_number ?? r.id.slice(0, 8)}
              </Link>
            ),
          },
          { id: "patient", header: "Patient", cell: (r) => <span className="font-mono text-xs">{r.patient_id.slice(0, 8)}</span> },
          { id: "wh", header: "Warehouse", cell: (r) => <span className="font-mono text-xs">{r.warehouse_id.slice(0, 8)}</span> },
          { id: "date", header: "Date", cell: (r) => new Date(r.dispense_date ?? r.created_at).toLocaleDateString() },
          { id: "status", header: "Status", cell: (r) => <Badge variant="outline">{r.status}</Badge> },
        ]}
      />
    </div>
  );
}

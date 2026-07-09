import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageContainer } from "@/components/app-shell";
import { DataGrid, FilterBar, KpiCard, KpiGrid } from "@/components/standards";
import type { DataGridColumn } from "@/components/standards";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTenant } from "@/hooks/use-tenant";
import { formatDateTime } from "@/lib/standards-format";
import { CheckCircle2, ShieldAlert, XCircle, Clock } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/people/verification")({
  component: VerificationCenter,
});

type V = Tables<"person_verifications">;

function VerificationCenter() {
  const { activeTenantId } = useTenant();
  const [method, setMethod] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const q = useQuery({
    queryKey: ["verifications", activeTenantId, method, statusFilter, search],
    queryFn: async () => {
      let qb = supabase
        .from("person_verifications")
        .select("*", { count: "exact" })
        .eq("tenant_id", activeTenantId!)
        .order("initiated_at", { ascending: false })
        .limit(100);
      if (method !== "all") qb = qb.eq("method", method);
      if (statusFilter !== "all") qb = qb.eq("status", statusFilter);
      if (search) qb = qb.or(`provider.ilike.%${search}%,document_type.ilike.%${search}%`);
      const { data, error, count } = await qb;
      if (error) throw new Error(error.message);
      return { rows: (data ?? []) as V[], total: count ?? 0 };
    },
    enabled: !!activeTenantId,
  });

  const rows = q.data?.rows ?? [];
  const kpi = rows.reduce(
    (acc, r) => {
      acc[r.status as "verified" | "pending" | "failed"] = (acc[r.status as "verified" | "pending" | "failed"] ?? 0) + 1;
      return acc;
    },
    {} as Record<"verified" | "pending" | "failed", number>,
  );

  const columns: DataGridColumn<V>[] = [
    { id: "person", header: "Person", cell: (r) => <span className="text-xs font-mono">{r.person_id.slice(0, 8)}…</span> },
    { id: "method", header: "Method", cell: (r) => <Badge variant="outline" className="capitalize">{r.method}</Badge> },
    { id: "status", header: "Status", cell: (r) => {
      const tone = r.status === "verified" ? "default" : r.status === "failed" ? "destructive" : "secondary";
      return <Badge variant={tone} className="capitalize">{r.status}</Badge>;
    }},
    { id: "doc", header: "Document", cell: (r) => r.document_type ?? "—" },
    { id: "provider", header: "Provider", cell: (r) => r.provider ?? "—" },
    { id: "initiated", header: "Initiated", cell: (r) => formatDateTime(r.initiated_at) },
    { id: "verified", header: "Verified", cell: (r) => formatDateTime(r.verified_at) },
  ];

  return (
    <PageContainer title="Verification center" description="Phone, email, and document verification history across the registry.">
      <KpiGrid>
        <KpiCard label="Verified" value={kpi.verified ?? 0} icon={CheckCircle2} tone="success" />
        <KpiCard label="Pending" value={kpi.pending ?? 0} icon={Clock} tone="warning" />
        <KpiCard label="Failed" value={kpi.failed ?? 0} icon={XCircle} tone="danger" />
        <KpiCard label="Total records" value={q.data?.total ?? 0} icon={ShieldAlert} />
      </KpiGrid>

      <div className="mt-4 space-y-3">
        <FilterBar search={search} onSearchChange={setSearch} placeholder="Search provider or document…">
          <Select value={method} onValueChange={setMethod}>
            <SelectTrigger className="w-[140px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All methods</SelectItem>
              <SelectItem value="phone">Phone</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="document">Document</SelectItem>
              <SelectItem value="video">Video</SelectItem>
              <SelectItem value="in_person">In person</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any status</SelectItem>
              <SelectItem value="verified">Verified</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </FilterBar>

        <DataGrid rows={rows} columns={columns} getRowId={(r) => r.id as string} isLoading={q.isLoading} />
      </div>
    </PageContainer>
  );
}

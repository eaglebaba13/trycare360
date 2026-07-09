import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageContainer } from "@/components/app-shell";
import { DataGrid, FilterBar } from "@/components/standards";
import type { DataGridColumn } from "@/components/standards";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTenant } from "@/hooks/use-tenant";
import { formatDate } from "@/lib/standards-format";
import type { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/people/tags")({
  component: TagsPage,
});

type Tag = Tables<"person_tag_defs">;

function TagsPage() {
  const { activeTenantId } = useTenant();
  const [search, setSearch] = useState("");

  const q = useQuery({
    queryKey: ["person-tag-defs", activeTenantId, search],
    queryFn: async () => {
      let qb = supabase
        .from("person_tag_defs")
        .select("*")
        .eq("tenant_id", activeTenantId!)
        .order("label", { ascending: true })
        .limit(500);
      if (search) qb = qb.ilike("label", `%${search}%`);
      const { data, error } = await qb;
      if (error) throw new Error(error.message);
      return data as Tag[];
    },
    enabled: !!activeTenantId,
  });

  const columns: DataGridColumn<Tag>[] = [
    {
      id: "color",
      header: "",
      width: "40px",
      cell: (r) => <span className="h-4 w-4 rounded-full inline-block" style={{ backgroundColor: r.color ?? "#94a3b8" }} />,
    },
    { id: "name", header: "Name", cell: (r) => <span className="font-medium">{r.label}</span> },
    { id: "slug", header: "Slug", cell: (r) => <span className="text-xs font-mono">{r.code}</span> },
    { id: "category", header: "Category", cell: (r) => r.category ? <Badge variant="outline">{r.category}</Badge> : <span className="text-muted-foreground">—</span> },
    { id: "created", header: "Created", cell: (r) => formatDate(r.created_at) },
    { id: "actions", header: "", cell: () => (
      <div className="flex gap-1">
        <Button size="sm" variant="ghost" disabled>Edit</Button>
        <Button size="sm" variant="ghost" disabled>Delete</Button>
      </div>
    )},
  ];

  return (
    <PageContainer
      title="Person tags"
      description="Manage tenant-wide tags used to segment persons across the registry."
      actions={<Button disabled>New tag</Button>}
    >
      <div className="space-y-3">
        <FilterBar search={search} onSearchChange={setSearch} placeholder="Search tags…" />
        <DataGrid rows={q.data ?? []} columns={columns} getRowId={(r) => r.id as string} isLoading={q.isLoading} emptyMessage="No tags defined yet." />
      </div>
    </PageContainer>
  );
}

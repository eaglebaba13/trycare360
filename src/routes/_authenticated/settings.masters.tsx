import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PageContainer } from "@/components/app-shell";
import { CrudTable, type FieldSpec } from "@/components/settings/crud-table";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Search, Database } from "lucide-react";
import { listRows } from "@/lib/api/config.functions";
import { useSession } from "@/hooks/use-session";

export const Route = createFileRoute("/_authenticated/settings/masters")({
  component: MastersPage,
});

type MasterType = {
  code: string;
  name: string;
  description: string | null;
  supports_hierarchy: boolean;
  is_system: boolean;
  icon: string | null;
};

function MastersPage() {
  const list = useServerFn(listRows);
  const { data: types = [] } = useQuery({
    queryKey: ["config", "master_types"],
    queryFn: () =>
      list({
        data: {
          table: "master_types",
          orderBy: { column: "display_order", ascending: true },
        },
      }) as Promise<MasterType[]>,
  });
  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const active = useMemo(
    () => types.find((t) => t.code === selected) ?? types[0],
    [types, selected],
  );

  const filtered = useMemo(() => {
    if (!search) return types;
    const s = search.toLowerCase();
    return types.filter(
      (t) => t.name.toLowerCase().includes(s) || t.code.toLowerCase().includes(s),
    );
  }, [types, search]);

  return (
    <PageContainer
      title="Master Lists"
      description="Every dropdown value in the platform. Add or edit values here — future modules read from these lists automatically."
    >
      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <Card className="p-3 h-fit lg:sticky lg:top-20">
          <div className="relative mb-3">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search master lists…"
              className="pl-8 h-9"
            />
          </div>
          <div className="max-h-[calc(100vh-14rem)] overflow-y-auto space-y-0.5">
            {filtered.map((t) => (
              <button
                key={t.code}
                onClick={() => setSelected(t.code)}
                className={cn(
                  "w-full text-left px-2.5 py-1.5 rounded-md text-sm transition-colors flex items-center justify-between gap-2",
                  active?.code === t.code
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent",
                )}
              >
                <span className="truncate">{t.name}</span>
                {t.is_system && (
                  <Badge variant="outline" className="h-4 text-[9px] px-1 shrink-0">
                    SYS
                  </Badge>
                )}
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="text-xs text-muted-foreground text-center py-4">
                No lists match.
              </div>
            )}
          </div>
        </Card>

        <div>
          {active ? (
            <MasterEditor type={active} />
          ) : (
            <Card className="p-8 text-center text-muted-foreground text-sm">
              Select a master list to edit its values.
            </Card>
          )}
        </div>
      </div>
    </PageContainer>
  );
}

function MasterEditor({ type }: { type: MasterType }) {
  const { data: session } = useSession();
  const tenantId = session?.profile?.active_tenant_id ?? null;

  const list = useServerFn(listRows);
  const { data: parents = [] } = useQuery({
    queryKey: ["config", "masters", type.code, "parents"],
    queryFn: () =>
      list({
        data: {
          table: "masters",
          filters: { type_code: type.code },
          orderBy: { column: "display_order", ascending: true },
        },
      }) as Promise<Array<{ id: string; name: string }>>,
    enabled: type.supports_hierarchy,
  });

  const fields: FieldSpec[] = [
    { key: "code", label: "Code", type: "text", required: true, placeholder: "unique_code", width: "160px" },
    { key: "name", label: "Name", type: "text", required: true },
    { key: "description", label: "Description", type: "textarea", hideInTable: true },
    ...(type.supports_hierarchy
      ? [{
          key: "parent_id",
          label: "Parent",
          type: "select" as const,
          options: [{ value: "", label: "— none —" }, ...parents.map((p) => ({ value: p.id, label: p.name }))],
        }]
      : []),
    { key: "display_order", label: "Order", type: "number", defaultValue: 0, width: "80px" },
    { key: "color", label: "Color", type: "text", hideInTable: true, placeholder: "#10b981" },
    { key: "icon", label: "Icon", type: "text", hideInTable: true, placeholder: "Star" },
    { key: "is_active", label: "Status", type: "boolean", defaultValue: true, width: "100px" },
  ];

  return (
    <div className="space-y-3">
      <Card className="p-4 flex items-start gap-3 bg-accent/30">
        <div className="h-9 w-9 rounded-md bg-primary/10 text-primary grid place-items-center">
          <Database className="h-4 w-4" />
        </div>
        <div>
          <div className="font-display font-semibold">{type.name}</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            <span className="font-mono">{type.code}</span>
            {type.description && <> — {type.description}</>}
          </div>
        </div>
      </Card>
      <CrudTable
        key={type.code}
        table="masters"
        fields={fields}
        filters={{ type_code: type.code }}
        orderBy={{ column: "display_order", ascending: true }}
        searchKey="name"
        contextValues={{ type_code: type.code, tenant_id: tenantId }}
        queryKeyExtra={[type.code]}
        emptyText={`No values yet for ${type.name}. Click Add to create the first one.`}
      />
    </div>
  );
}

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { PageContainer } from "@/components/app-shell";
import { OrgTree } from "@/components/organization/org-tree";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listRows } from "@/lib/api/config.functions";
import {
  upsertOrgUnit,
  deleteOrgUnit,
  listOrgUnits,
  type OrgUnitRow,
} from "@/lib/api/organization.functions";

export const Route = createFileRoute("/_authenticated/organization/tree")({
  component: OrgTreePage,
});

const TYPES: { value: string; label: string }[] = [
  { value: "corporate", label: "Corporate HQ" },
  { value: "state_master", label: "State Master Franchise" },
  { value: "city_franchise", label: "City Franchise" },
  { value: "advanced_center", label: "Advanced Center" },
  { value: "express_center", label: "Express Center" },
  { value: "department", label: "Department" },
];

type Draft = {
  id?: string;
  tenant_id: string;
  parent_id: string | null;
  type: (typeof TYPES)[number]["value"];
  name: string;
  code: string;
};

function OrgTreePage() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<OrgUnitRow | null>(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);

  const tenantsFn = useServerFn(listRows);
  const upsertFn = useServerFn(upsertOrgUnit);
  const deleteFn = useServerFn(deleteOrgUnit);
  const orgFn = useServerFn(listOrgUnits);

  const tenantsQ = useQuery({
    queryKey: ["tenants-list"],
    queryFn: () =>
      tenantsFn({
        data: { table: "companies", orderBy: { column: "name" } },
      }).catch(() => []),
  });
  // Real tenant list from tenants table via listOrgUnits query (fallback to first org unit's tenant)
  const anyUnitsQ = useQuery({
    queryKey: ["any-org-units-for-tenant"],
    queryFn: () => orgFn({ data: {} }),
  });
  const defaultTenantId = anyUnitsQ.data?.[0]?.tenant_id ?? "";

  const upsertMut = useMutation({
    mutationFn: (d: Draft) =>
      upsertFn({
        data: {
          ...(d.id ? { id: d.id } : {}),
          tenant_id: d.tenant_id,
          parent_id: d.parent_id ?? null,
          type: d.type as
            | "corporate"
            | "state_master"
            | "city_franchise"
            | "express_center"
            | "advanced_center"
            | "department",
          name: d.name,
          code: d.code || null,
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org-units"] });
      qc.invalidateQueries({ queryKey: ["org-summary"] });
      toast.success("Saved");
      setOpen(false);
      setDraft(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org-units"] });
      qc.invalidateQueries({ queryKey: ["org-summary"] });
      toast.success("Deleted");
      setSelected(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openNew = (parent: OrgUnitRow | null) => {
    setDraft({
      tenant_id: parent?.tenant_id ?? defaultTenantId,
      parent_id: parent?.id ?? null,
      type: parent ? "city_franchise" : "corporate",
      name: "",
      code: "",
    });
    setOpen(true);
  };
  const openEdit = (n: OrgUnitRow) => {
    setDraft({
      id: n.id,
      tenant_id: n.tenant_id,
      parent_id: n.parent_id,
      type: n.type as Draft["type"],
      name: n.name,
      code: n.code ?? "",
    });
    setOpen(true);
  };

  return (
    <PageContainer
      title="Organization Tree"
      description="Interactive hierarchy — search, expand, drag any node onto another to reparent. Everything reads live from the org_units table."
      actions={
        <Button onClick={() => openNew(null)}>
          <Plus className="h-4 w-4 mr-1" /> Add root
        </Button>
      }
    >
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <OrgTree
          selectedId={selected?.id}
          onSelect={setSelected}
        />
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {selected ? selected.name : "Select a node"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {selected ? (
              <>
                <dl className="text-sm space-y-1.5">
                  <Row label="Type" value={selected.type} />
                  <Row label="Code" value={selected.code ?? "—"} />
                  <Row label="ID" value={selected.id} mono />
                  <Row label="Parent" value={selected.parent_id ?? "root"} mono />
                </dl>
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button size="sm" variant="outline" onClick={() => openNew(selected)}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add child
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => openEdit(selected)}>
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      if (confirm("Delete this unit and all its descendants?"))
                        deleteMut.mutate(selected.id);
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Click a node in the tree to inspect, add a child, or move it.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={open} onOpenChange={(v) => !v && setOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{draft?.id ? "Edit unit" : "New unit"}</DialogTitle>
          </DialogHeader>
          {draft && (
            <div className="space-y-3">
              <div>
                <Label>Tenant ID</Label>
                <Input
                  value={draft.tenant_id}
                  onChange={(e) => setDraft({ ...draft, tenant_id: e.target.value })}
                  placeholder="uuid"
                />
              </div>
              <div>
                <Label>Type</Label>
                <Select
                  value={draft.type}
                  onValueChange={(v) => setDraft({ ...draft, type: v as Draft["type"] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Name</Label>
                <Input
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                />
              </div>
              <div>
                <Label>Code</Label>
                <Input
                  value={draft.code}
                  onChange={(e) => setDraft({ ...draft, code: e.target.value })}
                  placeholder="short code, unique per tenant"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!draft?.name || !draft?.tenant_id || upsertMut.isPending}
              onClick={() => draft && upsertMut.mutate(draft)}
            >
              {upsertMut.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start gap-2">
      <dt className="text-muted-foreground min-w-[70px]">{label}</dt>
      <dd className={mono ? "font-mono text-xs break-all" : ""}>{value}</dd>
    </div>
  );
}

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listDrugs, upsertDrug } from "@/lib/pharmacy/masters.functions";
import { DataGrid } from "@/components/standards/data-grid";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

type DrugRow = {
  id: string;
  code: string;
  name: string;
  generic_name: string | null;
  brand_name: string | null;
  strength: string | null;
  manufacturer: string | null;
  is_cold_chain: boolean | null;
  controlled_schedule_code: string | null;
  requires_prescription: boolean | null;
  is_active: boolean | null;
  base_unit_code: string;
};

export function DrugDetailPanel({ row }: { row: DrugRow | null }) {
  if (!row) return null;
  return (
    <div className="grid grid-cols-2 gap-3 text-sm">
      <div><div className="text-xs text-muted-foreground">Code</div><div className="font-mono">{row.code}</div></div>
      <div><div className="text-xs text-muted-foreground">Name</div><div>{row.name}</div></div>
      <div><div className="text-xs text-muted-foreground">Generic</div><div>{row.generic_name ?? "—"}</div></div>
      <div><div className="text-xs text-muted-foreground">Brand</div><div>{row.brand_name ?? "—"}</div></div>
      <div><div className="text-xs text-muted-foreground">Strength</div><div>{row.strength ?? "—"}</div></div>
      <div><div className="text-xs text-muted-foreground">Manufacturer</div><div>{row.manufacturer ?? "—"}</div></div>
      <div><div className="text-xs text-muted-foreground">Base unit</div><div>{row.base_unit_code}</div></div>
      <div>
        <div className="text-xs text-muted-foreground">Flags</div>
        <div className="flex flex-wrap gap-1">
          {row.is_cold_chain && <Badge>Cold-chain</Badge>}
          {row.controlled_schedule_code && <Badge variant="destructive">{row.controlled_schedule_code}</Badge>}
          {row.requires_prescription && <Badge variant="outline">Rx</Badge>}
        </div>
      </div>
    </div>
  );
}

export function DrugEditorDrawer({
  open, onOpenChange, row, tenantId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  row: DrugRow | null;
  tenantId: string | null;
}) {
  const qc = useQueryClient();
  const fn = useServerFn(upsertDrug);
  const [code, setCode] = useState(row?.code ?? "");
  const [name, setName] = useState(row?.name ?? "");
  const [strength, setStrength] = useState(row?.strength ?? "");
  const [manufacturer, setManufacturer] = useState(row?.manufacturer ?? "");
  const [baseUnit, setBaseUnit] = useState(row?.base_unit_code ?? "unit");
  const [active, setActive] = useState<boolean>(row?.is_active ?? true);
  const [rx, setRx] = useState<boolean>(row?.requires_prescription ?? true);

  const mut = useMutation({
    mutationFn: () =>
      fn({
        data: {
          tenantId,
          id: row?.id,
          code,
          name,
          strength: strength || null,
          manufacturer: manufacturer || null,
          baseUnitCode: baseUnit,
          isActive: active,
          requiresPrescription: rx,
        } as never,
      }),
    onSuccess: () => {
      toast.success("Drug saved");
      qc.invalidateQueries({ queryKey: ["pharmacy-drugs"] });
      onOpenChange(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader><SheetTitle>{row ? "Edit drug" : "New drug"}</SheetTitle></SheetHeader>
        <div className="mt-4 space-y-4">
          {row && <DrugDetailPanel row={row} />}
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Code</Label><Input value={code} onChange={(e) => setCode(e.target.value)} /></div>
            <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div><Label>Strength</Label><Input value={strength} onChange={(e) => setStrength(e.target.value)} /></div>
            <div><Label>Manufacturer</Label><Input value={manufacturer} onChange={(e) => setManufacturer(e.target.value)} /></div>
            <div><Label>Base unit</Label><Input value={baseUnit} onChange={(e) => setBaseUnit(e.target.value)} /></div>
            <div className="flex items-end gap-4">
              <label className="flex items-center gap-2 text-sm"><Switch checked={active} onCheckedChange={setActive} /> Active</label>
              <label className="flex items-center gap-2 text-sm"><Switch checked={rx} onCheckedChange={setRx} /> Rx</label>
            </div>
          </div>
        </div>
        <SheetFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => mut.mutate()} disabled={mut.isPending || !code || !name}>Save</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export function DrugMasterGrid({ tenantId }: { tenantId: string | null }) {
  const fn = useServerFn(listDrugs);
  const q = useQuery({
    queryKey: ["pharmacy-drugs", tenantId],
    queryFn: () => fn({ data: { tenantId, search: "", activeOnly: true, limit: 200 } as never }),
    enabled: true,
  });
  const rows = ((q.data as { rows?: DrugRow[] } | undefined)?.rows ?? []) as DrugRow[];
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<DrugRow | null>(null);

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => { setActive(null); setOpen(true); }}>New drug</Button>
      </div>
      <DataGrid<DrugRow>
        rows={rows}
        getRowId={(r) => r.id}
        isLoading={q.isLoading}
        emptyMessage="No drugs in master."
        onRowClick={(r) => { setActive(r); setOpen(true); }}
        columns={[
          { id: "code", header: "Code", cell: (r) => <span className="font-mono text-xs">{r.code}</span> },
          { id: "name", header: "Name", cell: (r) => r.name },
          { id: "strength", header: "Strength", cell: (r) => r.strength ?? "—" },
          { id: "mfr", header: "Manufacturer", cell: (r) => r.manufacturer ?? "—" },
          {
            id: "flags",
            header: "Flags",
            cell: (r) => (
              <div className="flex gap-1">
                {r.is_cold_chain && <Badge variant="secondary">Cold</Badge>}
                {r.controlled_schedule_code && <Badge variant="destructive">{r.controlled_schedule_code}</Badge>}
                {r.requires_prescription && <Badge variant="outline">Rx</Badge>}
              </div>
            ),
          },
        ]}
      />
      <DrugEditorDrawer open={open} onOpenChange={setOpen} row={active} tenantId={tenantId} />
    </div>
  );
}

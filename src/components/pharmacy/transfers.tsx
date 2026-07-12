import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { createTransfer, listTransfers, receiveTransfer } from "@/lib/pharmacy/transfers.functions";
import { WizardShell } from "@/components/standards/wizard-shell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TimelinePanel, type TimelineItem } from "@/components/standards/timeline-panel";
import { Trash2, Plus } from "lucide-react";
import { toast } from "sonner";

type Item = { drugId: string; batchId: string; quantity: string; unitCode: string };
type TransferRow = {
  id: string;
  transfer_no?: string | null;
  from_warehouse_id: string;
  to_warehouse_id: string;
  status: string;
  transfer_date: string;
  created_at: string;
};

export function TransferWizard({ tenantId, onDone }: { tenantId: string; onDone?: () => void }) {
  const [step, setStep] = useState(0);
  const [fromWh, setFromWh] = useState("");
  const [toWh, setToWh] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<Item[]>([{ drugId: "", batchId: "", quantity: "1", unitCode: "unit" }]);
  const qc = useQueryClient();
  const fn = useServerFn(createTransfer);

  const mut = useMutation({
    mutationFn: () =>
      fn({
        data: {
          tenantId,
          fromWarehouseId: fromWh,
          toWarehouseId: toWh,
          notes: notes || null,
          items: items.map((i) => ({
            drugId: i.drugId,
            batchId: i.batchId || null,
            quantity: Number(i.quantity),
            unitCode: i.unitCode,
          })),
        } as never,
      }),
    onSuccess: () => {
      toast.success("Transfer created");
      qc.invalidateQueries({ queryKey: ["pharmacy-transfers"] });
      onDone?.();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const canRoute = fromWh.length > 0 && toWh.length > 0 && fromWh !== toWh;
  const canItems = items.every((i) => i.drugId && Number(i.quantity) > 0);

  return (
    <WizardShell
      steps={[
        { id: "route", label: "Route" },
        { id: "items", label: "Items" },
        { id: "review", label: "Review" },
      ]}
      currentIndex={step}
      onStep={setStep}
      onBack={() => setStep((s) => Math.max(0, s - 1))}
      onNext={() => setStep((s) => Math.min(2, s + 1))}
      onFinish={() => mut.mutate()}
      canProceed={step === 0 ? canRoute : step === 1 ? canItems : true}
      isSubmitting={mut.isPending}
      finishLabel="Create transfer"
    >
      {step === 0 && (
        <div className="grid grid-cols-1 gap-3">
          <div><Label>From warehouse ID</Label><Input value={fromWh} onChange={(e) => setFromWh(e.target.value)} placeholder="uuid" /></div>
          <div><Label>To warehouse ID</Label><Input value={toWh} onChange={(e) => setToWh(e.target.value)} placeholder="uuid" /></div>
          <div><Label>Notes</Label><Input value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        </div>
      )}
      {step === 1 && (
        <div className="space-y-3">
          {items.map((it, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-4"><Label>Drug ID</Label><Input value={it.drugId} onChange={(e) => setItems((xs) => xs.map((x, i) => i === idx ? { ...x, drugId: e.target.value } : x))} /></div>
              <div className="col-span-3"><Label>Batch ID</Label><Input value={it.batchId} onChange={(e) => setItems((xs) => xs.map((x, i) => i === idx ? { ...x, batchId: e.target.value } : x))} /></div>
              <div className="col-span-2"><Label>Qty</Label><Input value={it.quantity} onChange={(e) => setItems((xs) => xs.map((x, i) => i === idx ? { ...x, quantity: e.target.value } : x))} /></div>
              <div className="col-span-2"><Label>Unit</Label><Input value={it.unitCode} onChange={(e) => setItems((xs) => xs.map((x, i) => i === idx ? { ...x, unitCode: e.target.value } : x))} /></div>
              <div className="col-span-1">
                <Button variant="ghost" size="icon" onClick={() => setItems((xs) => xs.filter((_, i) => i !== idx))}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => setItems((xs) => [...xs, { drugId: "", batchId: "", quantity: "1", unitCode: "unit" }])}>
            <Plus className="h-4 w-4 mr-1" /> Add item
          </Button>
        </div>
      )}
      {step === 2 && (
        <div className="space-y-2 text-sm">
          <div>From <span className="font-mono">{fromWh}</span> → To <span className="font-mono">{toWh}</span></div>
          <div>{items.length} line item(s)</div>
          <div className="text-muted-foreground text-xs">FEFO batch selection and stock movement will be handled by the server engine.</div>
        </div>
      )}
    </WizardShell>
  );
}

export function TransferTimeline({ tenantId }: { tenantId: string }) {
  const fn = useServerFn(listTransfers);
  const rcv = useServerFn(receiveTransfer);
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["pharmacy-transfers", tenantId],
    queryFn: () => fn({ data: { tenantId, limit: 100 } as never }),
    enabled: !!tenantId,
  });
  const rows = ((q.data as { rows?: TransferRow[] } | undefined)?.rows ?? []) as TransferRow[];
  const recvMut = useMutation({
    mutationFn: (id: string) => rcv({ data: { tenantId, transferId: id } as never }),
    onSuccess: () => { toast.success("Transfer received"); qc.invalidateQueries({ queryKey: ["pharmacy-transfers"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const items: TimelineItem[] = rows.map((t) => ({
    ts: t.transfer_date ?? t.created_at,
    event_type: t.status,
    title: `${t.transfer_no ?? t.id.slice(0, 8)} · ${t.from_warehouse_id.slice(0, 8)} → ${t.to_warehouse_id.slice(0, 8)}`,
    body: t.status,
  }));

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader><CardTitle className="text-base">Transfers</CardTitle></CardHeader>
        <CardContent>
          {rows.length === 0 && <div className="text-sm text-muted-foreground py-4">No transfers yet.</div>}
          <ul className="divide-y">
            {rows.map((t) => (
              <li key={t.id} className="py-2 flex items-center justify-between gap-3 text-sm">
                <div className="truncate">
                  <span className="font-mono text-xs">{t.transfer_no ?? t.id.slice(0, 8)}</span>
                  <span className="mx-2 text-muted-foreground">{t.from_warehouse_id.slice(0, 8)} → {t.to_warehouse_id.slice(0, 8)}</span>
                  <Badge variant="outline">{t.status}</Badge>
                </div>
                {t.status !== "received" && (
                  <Button size="sm" variant="outline" disabled={recvMut.isPending} onClick={() => recvMut.mutate(t.id)}>
                    Receive
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
      {items.length > 0 && <TimelinePanel items={items} />}
    </div>
  );
}

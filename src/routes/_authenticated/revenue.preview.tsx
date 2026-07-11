/**
 * Commission Preview — simulate commission for a synthetic revenue event.
 */
import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTenant } from "@/hooks/use-tenant";
import { previewCommissionForRevenue, previewCommission } from "@/lib/commissions/commissions.functions";

export const Route = createFileRoute("/_authenticated/revenue/preview")({
  component: PreviewPage,
});

const CATEGORIES = ["treatment", "product", "membership", "subscription", "consultation", "other"] as const;

function fmt(n: number, cur = "INR") {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: cur, maximumFractionDigits: 0 }).format(n);
}

function PreviewPage() {
  const { activeTenantId } = useTenant();
  const simFn = useServerFn(previewCommissionForRevenue);
  const eventFn = useServerFn(previewCommission);

  const [amount, setAmount] = useState("10000");
  const [currency, setCurrency] = useState("INR");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("treatment");
  const [eventId, setEventId] = useState("");

  const simM = useMutation({
    mutationFn: () =>
      simFn({
        data: {
          tenant_id: activeTenantId!,
          amount: Number(amount) || 0,
          currency,
          category,
        },
      }),
  });
  const evM = useMutation({
    mutationFn: () => eventFn({ data: { revenue_event_id: eventId } }),
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card>
        <CardHeader><CardTitle className="text-base">Simulate Revenue Event</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Amount</Label>
              <Input value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Currency</Label>
              <Input value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} maxLength={3} />
            </div>
          </div>
          <div>
            <Label className="text-xs">Category</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => simM.mutate()} disabled={simM.isPending || !activeTenantId}>
            Preview Commission
          </Button>

          {simM.data && (
            <div className="space-y-2 pt-3 border-t">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Calculated splits</div>
              {(simM.data.previews as any[]).map((p, i) => (
                <div key={i} className="border rounded-md p-2 text-xs">
                  <div className="flex justify-between">
                    <Badge variant="outline">{p.beneficiary_type}</Badge>
                    <span className="font-medium">{fmt(Number(p.calc_amount ?? 0), currency)}</span>
                  </div>
                  <div className="text-muted-foreground mt-1 font-mono truncate">{p.beneficiary_id}</div>
                </div>
              ))}
              {(!simM.data.previews || simM.data.previews.length === 0) && (
                <div className="text-xs text-muted-foreground">No rules matched.</div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Preview Existing Revenue Event</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-xs">Revenue Event ID</Label>
            <Input value={eventId} onChange={(e) => setEventId(e.target.value)} placeholder="uuid…" />
          </div>
          <Button onClick={() => evM.mutate()} disabled={evM.isPending || !eventId}>Preview</Button>
          {evM.data && (
            <div className="space-y-2 pt-3 border-t">
              {(evM.data.previews as any[]).map((p, i) => (
                <div key={i} className="border rounded-md p-2 text-xs">
                  <div className="flex justify-between">
                    <Badge variant="outline">{p.beneficiary_type}</Badge>
                    <span className="font-medium">{fmt(Number(p.calc_amount ?? 0), p.currency ?? "INR")}</span>
                  </div>
                  <div className="text-muted-foreground mt-1 font-mono truncate">{p.beneficiary_id}</div>
                </div>
              ))}
              {(!evM.data.previews || evM.data.previews.length === 0) && (
                <div className="text-xs text-muted-foreground">No rules matched.</div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

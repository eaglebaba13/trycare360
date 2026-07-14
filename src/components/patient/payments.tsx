/** Patient Portal — Payments workspace. */
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DataGrid } from "@/components/standards/data-grid";
import {
  getRefundStatus,
  listMyInvoices,
  listMyPayments,
  requestPaymentLink,
} from "@/lib/patient/payments.functions";
import { formatDate, formatDateTime } from "@/lib/standards-format";
import { PatientShell } from "./shell";

type Invoice = { id: string; number?: string | null; total: number; balance?: number | null; status: string; created_at: string; currency?: string | null };
type Payment = { id: string; amount: number; method?: string | null; status: string; created_at: string };

export function InvoicesGrid() {
  const fn = useServerFn(listMyInvoices);
  const q = useQuery<Invoice[]>({ queryKey: ["patient-invoices"], queryFn: () => fn({ data: {} }) as unknown as Promise<Invoice[]> });
  return (
    <DataGrid rows={q.data ?? []} getRowId={(r) => r.id} isLoading={q.isLoading} emptyMessage="No invoices."
      columns={[
        { id: "when", header: "Date", cell: (r) => formatDate(r.created_at) },
        { id: "num", header: "Invoice", cell: (r) => r.number ?? r.id.slice(0, 8) },
        { id: "amt", header: "Total", cell: (r) => `${r.currency ?? "INR"} ${r.total.toLocaleString()}`, className: "text-right tabular-nums" },
        { id: "bal", header: "Balance", cell: (r) => r.balance != null ? r.balance.toLocaleString() : "—", className: "text-right tabular-nums" },
        { id: "st", header: "Status", cell: (r) => <Badge variant="outline">{r.status}</Badge> },
      ]} />
  );
}

export function PaymentsGrid() {
  const fn = useServerFn(listMyPayments);
  const q = useQuery<Payment[]>({ queryKey: ["patient-payments"], queryFn: () => fn({ data: {} }) as unknown as Promise<Payment[]> });
  return (
    <DataGrid rows={q.data ?? []} getRowId={(r) => r.id} isLoading={q.isLoading} emptyMessage="No payments."
      columns={[
        { id: "when", header: "When", cell: (r) => formatDateTime(r.created_at) },
        { id: "amt", header: "Amount", cell: (r) => r.amount.toLocaleString(), className: "text-right tabular-nums" },
        { id: "m", header: "Method", cell: (r) => r.method ?? "—" },
        { id: "st", header: "Status", cell: (r) => <Badge variant="outline">{r.status}</Badge> },
      ]} />
  );
}

export function PaymentLinkCard() {
  const fn = useServerFn(requestPaymentLink);
  const [form, setForm] = useState({ invoiceId: "", amount: "" });
  const mut = useMutation({
    mutationFn: () => fn({ data: { invoiceId: form.invoiceId, amount: Number(form.amount) } }),
    onSuccess: (r) => {
      const url = (r as { url?: string; paymentUrl?: string }).paymentUrl ?? (r as { url?: string }).url;
      if (url) window.open(url, "_blank");
      else toast.success("Payment link requested");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Card>
      <CardHeader><CardTitle className="text-sm">Request Payment Link</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-2 md:grid-cols-3 items-end">
          <div><Label>Invoice ID</Label><Input value={form.invoiceId} onChange={(e) => setForm({ ...form, invoiceId: e.target.value })} /></div>
          <div><Label>Amount</Label><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
          <Button onClick={() => mut.mutate()} disabled={mut.isPending || !form.invoiceId || !form.amount}>Request</Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function RefundStatusCard() {
  const fn = useServerFn(getRefundStatus);
  const [paymentId, setPaymentId] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const mut = useMutation({
    mutationFn: () => fn({ data: { paymentId } }),
    onSuccess: (r) => setStatus((r as { status?: string }).status ?? "unknown"),
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Card>
      <CardHeader><CardTitle className="text-sm">Refund Status</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <div className="flex gap-2 items-end">
          <div className="flex-1"><Label>Payment ID</Label><Input value={paymentId} onChange={(e) => setPaymentId(e.target.value)} /></div>
          <Button onClick={() => mut.mutate()} disabled={mut.isPending || !paymentId}>Check</Button>
        </div>
        {status && <div className="text-sm">Status: <Badge variant="outline">{status}</Badge></div>}
      </CardContent>
    </Card>
  );
}

export function PatientPaymentsPage() {
  return (
    <PatientShell title="Payments" description="Invoices, payments and refunds.">
      <div className="space-y-4">
        <Card><CardHeader><CardTitle className="text-sm">Invoices</CardTitle></CardHeader><CardContent><InvoicesGrid /></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Payments</CardTitle></CardHeader><CardContent><PaymentsGrid /></CardContent></Card>
        <div className="grid gap-4 lg:grid-cols-2">
          <PaymentLinkCard />
          <RefundStatusCard />
        </div>
      </div>
    </PatientShell>
  );
}

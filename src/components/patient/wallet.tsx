/** Patient Portal — Wallet workspace. */
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getMyWallet, listWalletTransactions } from "@/lib/patient/wallet.functions";
import { formatDateTime } from "@/lib/standards-format";
import { DataGrid } from "@/components/standards/data-grid";
import { PatientShell } from "./shell";

type Wallet = { balance: number; currency: string; status?: string } | null;
type Tx = { id: string; amount: number; direction: string; note: string | null; created_at: string };

export function WalletBalanceCard() {
  const fn = useServerFn(getMyWallet);
  const q = useQuery({ queryKey: ["patient-wallet"], queryFn: () => fn({}) as unknown as Promise<{ wallet: Wallet }> });
  const w = q.data?.wallet;
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">Wallet Balance</CardTitle></CardHeader>
      <CardContent>
        <div className="text-3xl font-semibold tabular-nums">
          {w?.currency ?? "INR"} {(w?.balance ?? 0).toLocaleString()}
        </div>
        {w?.status && <Badge variant="outline" className="mt-2">{w.status}</Badge>}
      </CardContent>
    </Card>
  );
}

export function WalletTransactions() {
  const fn = useServerFn(listWalletTransactions);
  const q = useQuery<Tx[]>({
    queryKey: ["patient-wallet-tx"],
    queryFn: () => fn({ data: {} }) as unknown as Promise<Tx[]>,
  });
  return (
    <DataGrid
      rows={q.data ?? []}
      getRowId={(r) => r.id}
      isLoading={q.isLoading}
      emptyMessage="No wallet transactions yet."
      columns={[
        { id: "when", header: "When", cell: (r) => formatDateTime(r.created_at) },
        { id: "dir", header: "Direction", cell: (r) => <Badge variant="outline">{r.direction}</Badge> },
        { id: "amt", header: "Amount", cell: (r) => r.amount.toLocaleString(), className: "text-right tabular-nums" },
        { id: "note", header: "Note", cell: (r) => r.note ?? "—" },
      ]}
    />
  );
}

export function WalletDashboard() {
  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      <WalletBalanceCard />
      <Card>
        <CardHeader><CardTitle className="text-sm">Recent Transactions</CardTitle></CardHeader>
        <CardContent><WalletTransactions /></CardContent>
      </Card>
    </div>
  );
}

export function PatientWalletPage() {
  return (
    <PatientShell title="Wallet" description="Prepaid balance and transaction history.">
      <WalletDashboard />
    </PatientShell>
  );
}

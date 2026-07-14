/** Patient Portal — Membership workspace. */
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { listMyMemberships } from "@/lib/patient/membership.functions";
import { formatDate } from "@/lib/standards-format";
import { PatientShell } from "./shell";

type M = {
  id: string; plan_name: string; tier: string | null; status: string;
  starts_at: string | null; expires_at: string | null; auto_renew: boolean | null;
  meta?: Record<string, unknown> | null;
};

function useMemberships() {
  const fn = useServerFn(listMyMemberships);
  return useQuery<M[]>({ queryKey: ["patient-memberships"], queryFn: () => fn({ data: {} }) as unknown as Promise<M[]> });
}

export function MembershipDashboard() {
  const q = useMemberships();
  const rows = q.data ?? [];
  const active = rows.find((m) => m.status === "active");
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader><CardTitle className="text-sm">Active Plan</CardTitle></CardHeader>
        <CardContent>
          {active ? (
            <div className="space-y-1">
              <div className="text-xl font-semibold">{active.plan_name}</div>
              <div className="text-sm text-muted-foreground">
                {active.tier ? `Tier: ${active.tier} · ` : ""}Valid till {formatDate(active.expires_at)}
              </div>
              <Badge variant="outline">{active.auto_renew ? "Auto-renew ON" : "Auto-renew OFF"}</Badge>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No active membership.</div>
          )}
        </CardContent>
      </Card>
      <BenefitsViewer membership={active ?? null} />
    </div>
  );
}

export function BenefitsViewer({ membership }: { membership: M | null }) {
  const benefits = (membership?.meta as { benefits?: string[] } | null | undefined)?.benefits ?? [];
  return (
    <Card>
      <CardHeader><CardTitle className="text-sm">Benefits</CardTitle></CardHeader>
      <CardContent>
        {benefits.length === 0 ? (
          <div className="text-xs text-muted-foreground">Benefits appear here when your plan is active.</div>
        ) : (
          <ul className="list-disc pl-5 text-sm space-y-1">{benefits.map((b, i) => <li key={i}>{b}</li>)}</ul>
        )}
      </CardContent>
    </Card>
  );
}

export function MembershipHistory() {
  const q = useMemberships();
  const rows = q.data ?? [];
  return (
    <Card>
      <CardHeader><CardTitle className="text-sm">Membership History</CardTitle></CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <div className="text-xs text-muted-foreground">No history yet.</div>
        ) : (
          <ul className="divide-y">
            {rows.map((m) => (
              <li key={m.id} className="py-2 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">{m.plan_name}</div>
                  <div className="text-xs text-muted-foreground">{formatDate(m.starts_at)} → {formatDate(m.expires_at)}</div>
                </div>
                <Badge variant="outline">{m.status}</Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function PatientMembershipPage() {
  return (
    <PatientShell title="Membership" description="Plans, benefits and renewals.">
      <div className="space-y-4">
        <MembershipDashboard />
        <MembershipHistory />
      </div>
    </PatientShell>
  );
}

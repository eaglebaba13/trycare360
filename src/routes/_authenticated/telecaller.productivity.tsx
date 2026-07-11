/**
 * Productivity Dashboard — calls, talk time, conversion %, follow-up %, revenue.
 */
import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PhoneCall, Timer, Target, CalendarCheck, IndianRupee } from "lucide-react";
import { KpiCard, KpiGrid } from "@/components/standards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTenant } from "@/hooks/use-tenant";
import { useSession } from "@/hooks/use-session";
import { listInteractions } from "@/lib/interactions/interactions.functions";
import { listLeads } from "@/lib/leads/leads.functions";
import { listFollowUps } from "@/lib/leads/followup.functions";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export const Route = createFileRoute("/_authenticated/telecaller/productivity")({
  component: ProductivityPage,
});

function ProductivityPage() {
  const { activeTenantId } = useTenant();
  const { data: session } = useSession();
  const userId = session?.userId ?? null;

  const from = useMemo(() => new Date(Date.now() - 30 * 86400_000).toISOString(), []);
  const intFn = useServerFn(listInteractions);
  const leadsFn = useServerFn(listLeads);
  const fuFn = useServerFn(listFollowUps);

  const intsQ = useQuery({
    queryKey: ["prod-ints", activeTenantId, from],
    queryFn: () => intFn({ data: { tenant_id: activeTenantId!, from, limit: 500, offset: 0 } }),
    enabled: !!activeTenantId,
  });
  const leadsQ = useQuery({
    queryKey: ["prod-leads", activeTenantId, userId],
    queryFn: () => leadsFn({ data: { tenant_id: activeTenantId!, owner_id: userId!, limit: 500, offset: 0 } }),
    enabled: !!activeTenantId && !!userId,
  });
  const fuQ = useQuery({
    queryKey: ["prod-fu", activeTenantId, userId],
    queryFn: () => fuFn({ data: { tenant_id: activeTenantId!, owner_id: userId!, limit: 500, offset: 0 } }),
    enabled: !!activeTenantId && !!userId,
  });

  const myInts = (intsQ.data?.rows ?? []).filter((i: { owner_id: string | null }) => i.owner_id === userId);
  const calls = myInts.filter((i: { channel: string }) => i.channel === "call");
  const talkTime = calls.reduce((a: number, c: { duration_sec: number | null }) => a + Number(c.duration_sec ?? 0), 0);

  const leads = leadsQ.data?.rows ?? [];
  const converted = leads.filter((l: { status: string; converted_at: string | null }) => l.status === "won" || !!l.converted_at).length;
  const conversionPct = leads.length ? Math.round((converted / leads.length) * 100) : 0;
  const revenue = leads.reduce((a: number, l: { converted_at: string | null; expected_value: number | null }) =>
    a + (l.converted_at ? Number(l.expected_value ?? 0) : 0), 0);

  const fus = fuQ.data?.rows ?? [];
  const completed = fus.filter((f: { status: string }) => f.status === "completed").length;
  const fuPct = fus.length ? Math.round((completed / fus.length) * 100) : 0;

  const dailyChart = useMemo(() => {
    const days: Record<string, { day: string; calls: number; talk: number }> = {};
    for (let i = 13; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400_000);
      const key = d.toISOString().slice(0, 10);
      days[key] = { day: key.slice(5), calls: 0, talk: 0 };
    }
    for (const c of calls) {
      const key = String(c.occurred_at).slice(0, 10);
      if (days[key]) {
        days[key].calls++;
        days[key].talk += Math.round(Number(c.duration_sec ?? 0) / 60);
      }
    }
    return Object.values(days);
  }, [calls]);

  const talkMin = Math.round(talkTime / 60);

  return (
    <div className="space-y-6">
      <KpiGrid>
        <KpiCard label="Calls (30d)" value={calls.length} icon={PhoneCall} tone="info" />
        <KpiCard label="Talk Time" value={`${talkMin}m`} icon={Timer} />
        <KpiCard label="Conversion %" value={`${conversionPct}%`} icon={Target} tone="success" />
        <KpiCard label="Follow-up %" value={`${fuPct}%`} hint={`${completed}/${fus.length}`} icon={CalendarCheck} />
        <KpiCard label="Revenue" value={`₹${revenue.toLocaleString("en-IN")}`} icon={IndianRupee} tone="success" />
      </KpiGrid>

      <Card>
        <CardHeader><CardTitle className="text-base">Calls — last 14 days</CardTitle></CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer>
            <BarChart data={dailyChart}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="calls" fill="hsl(var(--primary))" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

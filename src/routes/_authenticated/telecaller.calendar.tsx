/**
 * Follow-up Calendar — daily / weekly / monthly / missed / upcoming.
 */
import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTenant } from "@/hooks/use-tenant";
import { useSession } from "@/hooks/use-session";
import { listFollowUps } from "@/lib/leads/followup.functions";
import { formatDistanceToNow } from "@/lib/standards-format";

export const Route = createFileRoute("/_authenticated/telecaller/calendar")({
  component: FollowUpCalendar,
});

type View = "daily" | "weekly" | "monthly" | "missed" | "upcoming";

function FollowUpCalendar() {
  const { activeTenantId } = useTenant();
  const { data: session } = useSession();
  const userId = session?.userId ?? null;
  const [view, setView] = useState<View>("daily");

  const fuFn = useServerFn(listFollowUps);
  // Pull a wide window; filter client-side per view.
  const cutoff = useMemo(() => new Date(Date.now() + 60 * 24 * 3600_000).toISOString(), []);
  const q = useQuery({
    queryKey: ["fu-cal", activeTenantId, userId],
    queryFn: () => fuFn({ data: { tenant_id: activeTenantId!, owner_id: userId!, before: cutoff, limit: 200, offset: 0 } }),
    enabled: !!activeTenantId && !!userId,
  });
  const rows = q.data?.rows ?? [];

  const grouped = useMemo(() => {
    const now = Date.now();
    const startOfDay = new Date(new Date().setHours(0, 0, 0, 0)).getTime();
    const endOfDay = new Date(new Date().setHours(23, 59, 59, 999)).getTime();
    const endOfWeek = startOfDay + 7 * 86400_000;
    const endOfMonth = startOfDay + 30 * 86400_000;
    const filtered = rows.filter((r: Record<string, unknown>) => {
      const t = Date.parse(String(r.due_at));
      const isPending = r.status === "pending";
      switch (view) {
        case "daily": return isPending && t >= startOfDay && t <= endOfDay;
        case "weekly": return isPending && t >= startOfDay && t <= endOfWeek;
        case "monthly": return isPending && t >= startOfDay && t <= endOfMonth;
        case "missed": return isPending && t < now;
        case "upcoming": return isPending && t > now;
      }
    });
    return filtered.sort((a: Record<string, unknown>, b: Record<string, unknown>) =>
      Date.parse(String(a.due_at)) - Date.parse(String(b.due_at)),
    );
  }, [rows, view]);

  return (
    <div className="space-y-4">
      <Tabs value={view} onValueChange={(v) => setView(v as View)}>
        <TabsList>
          <TabsTrigger value="daily">Daily</TabsTrigger>
          <TabsTrigger value="weekly">Weekly</TabsTrigger>
          <TabsTrigger value="monthly">Monthly</TabsTrigger>
          <TabsTrigger value="missed">Missed</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
        </TabsList>
      </Tabs>

      {q.isLoading && <div className="text-sm text-muted-foreground">Loading…</div>}
      {!q.isLoading && grouped.length === 0 && (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">No follow-ups in this view.</CardContent></Card>
      )}
      <div className="grid gap-2">
        {grouped.map((f: Record<string, unknown>) => {
          const due = String(f.due_at);
          const overdue = Date.parse(due) < Date.now();
          return (
            <Card key={String(f.id)}>
              <CardContent className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{String(f.kind)}</Badge>
                    {overdue && <Badge variant="destructive">Overdue</Badge>}
                    <Link to="/telecaller/workspace/$leadId" params={{ leadId: String(f.lead_id) }} className="text-sm font-medium underline">
                      Lead {String(f.lead_id).slice(0, 8)}
                    </Link>
                  </div>
                  {f.notes ? <div className="text-xs text-muted-foreground mt-1 truncate">{String(f.notes)}</div> : null}
                </div>
                <div className="text-right shrink-0 text-xs text-muted-foreground">
                  <div>{new Date(due).toLocaleString()}</div>
                  <div>{formatDistanceToNow(due)}</div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Maximize2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTenant } from "@/hooks/use-tenant";
import { supabase } from "@/integrations/supabase/client";
import {
  listQueues,
  listQueueTokens,
} from "@/lib/scheduling/queue-lists.functions";

export const Route = createFileRoute(
  "/_authenticated/scheduling/token-display",
)({
  component: TokenDisplayPage,
});

function TokenDisplayPage() {
  const { activeTenantId } = useTenant();
  const [branchId, setBranchId] = useState<string | null>(null);
  const [queueId, setQueueId] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());
  const qc = useQueryClient();

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const queuesFn = useServerFn(listQueues);
  const tokensFn = useServerFn(listQueueTokens);

  const queuesQ = useQuery({
    queryKey: ["display-queues", activeTenantId, branchId],
    queryFn: () =>
      queuesFn({
        data: {
          tenant_id: activeTenantId!,
          branch_id: branchId,
          queue_date: format(new Date(), "yyyy-MM-dd"),
        },
      }),
    enabled: !!activeTenantId,
  });
  const queues = queuesQ.data?.rows ?? [];

  const tokensQ = useQuery({
    queryKey: ["display-tokens", activeTenantId, queueId],
    queryFn: () =>
      tokensFn({
        data: {
          tenant_id: activeTenantId!,
          queue_id: queueId,
          limit: 100,
        },
      }),
    enabled: !!activeTenantId && !!queueId,
    refetchInterval: 5_000,
  });

  useEffect(() => {
    if (!activeTenantId) return;
    const ch = supabase
      .channel(`token-display-${activeTenantId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "queue_tokens" },
        () => {
          qc.invalidateQueries({ queryKey: ["display-tokens"] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [activeTenantId, qc]);

  const tokens = tokensQ.data?.rows ?? [];
  const nowServing = useMemo(
    () =>
      tokens.find(
        (t) =>
          t.status === "called" ||
          t.status === "in_service" ||
          t.status === "in_consultation",
      ),
    [tokens],
  );
  const waiting = useMemo(
    () => tokens.filter((t) => t.status === "waiting" || t.status === "recalled"),
    [tokens],
  );
  const nextTokens = waiting.slice(0, 6);
  const currentQueue = queues.find((q) => q.id === queueId) ?? null;

  const goFullscreen = () => {
    void document.documentElement.requestFullscreen?.();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 px-4 py-2 print:hidden">
        <Button
          asChild
          size="sm"
          variant="ghost"
          className="text-slate-200 hover:text-white"
        >
          <a href="/scheduling/queue">
            <ArrowLeft className="mr-1 h-4 w-4" /> Back
          </a>
        </Button>
        <Select
          value={queueId ?? "__none"}
          onValueChange={(v) => setQueueId(v === "__none" ? null : v)}
        >
          <SelectTrigger className="h-8 w-[280px] bg-slate-900 border-slate-700 text-slate-100">
            <SelectValue placeholder="Select a queue" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none">Select a queue</SelectItem>
            {queues.map((q) => (
              <SelectItem key={q.id} value={q.id}>
                {q.name} · {q.code}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="ml-auto flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={goFullscreen}
            className="border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800"
          >
            <Maximize2 className="mr-2 h-4 w-4" /> Fullscreen
          </Button>
        </div>
      </div>

      <div className="flex-1 grid gap-6 p-8 lg:grid-cols-[2fr_1fr]">
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/50 p-10">
          <div className="text-lg uppercase tracking-[0.4em] text-slate-400">
            {currentQueue?.name ?? "Please select a queue"}
          </div>
          <div className="mt-2 text-sm text-slate-500">
            {format(now, "EEEE, PPP · pp")}
          </div>
          <div className="mt-8 text-2xl uppercase text-slate-300">
            Now Serving
          </div>
          <div className="mt-4 text-[10rem] leading-none font-bold tabular-nums text-emerald-400">
            {nowServing?.token_label ?? "—"}
          </div>
          <div className="mt-6 grid grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-xs uppercase text-slate-500">Waiting</div>
              <div className="text-4xl font-semibold tabular-nums">
                {waiting.length}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase text-slate-500">Est. wait</div>
              <div className="text-4xl font-semibold tabular-nums">
                {waiting.length *
                  (currentQueue?.avg_service_minutes ?? 15)}
                m
              </div>
            </div>
            <div>
              <div className="text-xs uppercase text-slate-500">Avg / patient</div>
              <div className="text-4xl font-semibold tabular-nums">
                {currentQueue?.avg_service_minutes ?? 15}m
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8">
          <div className="text-lg uppercase tracking-[0.3em] text-slate-400">
            Next
          </div>
          <ul className="mt-6 space-y-4">
            {nextTokens.map((t, i) => (
              <li
                key={t.id}
                className="flex items-center justify-between border-b border-slate-800 pb-3 last:border-0"
              >
                <div className="text-3xl font-semibold tabular-nums text-slate-100">
                  {t.token_label}
                </div>
                <div className="text-sm text-slate-500 tabular-nums">
                  #{i + 1} in line
                </div>
              </li>
            ))}
            {nextTokens.length === 0 && (
              <li className="text-slate-500">No one waiting.</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}

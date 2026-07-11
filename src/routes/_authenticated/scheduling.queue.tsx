import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { startOfDay, endOfDay, format } from "date-fns";
import {
  Users,
  PhoneCall,
  Stethoscope,
  CheckCircle2,
  Timer,
  AlertTriangle,
  UserX,
  MonitorPlay,
  SkipForward,
  RotateCcw,
  ArrowRightLeft,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { SchedulerShell } from "@/components/scheduling/scheduler-shell";
import { useTenant } from "@/hooks/use-tenant";
import { supabase } from "@/integrations/supabase/client";
import {
  listQueues,
  listQueueTokens,
  getQueueKpis,
} from "@/lib/scheduling/queue-lists.functions";
import {
  callNextInQueue,
  skipQueueToken,
  recallQueueToken,
  transferQueueToken,
} from "@/lib/scheduling/queue.functions";

export const Route = createFileRoute("/_authenticated/scheduling/queue")({
  component: QueuePage,
});

function QueuePage() {
  const { activeTenantId } = useTenant();
  const [date, setDate] = useState<Date>(new Date());
  const [branchId, setBranchId] = useState<string | null>(null);
  const [queueId, setQueueId] = useState<string | null>(null);
  const [tab, setTab] = useState("branch");
  const qc = useQueryClient();

  const range = useMemo(
    () => ({
      from: startOfDay(date).toISOString(),
      to: endOfDay(date).toISOString(),
    }),
    [date],
  );

  const kpiFn = useServerFn(getQueueKpis);
  const queuesFn = useServerFn(listQueues);
  const tokensFn = useServerFn(listQueueTokens);

  const kpiQ = useQuery({
    queryKey: ["queue-kpis", activeTenantId, branchId, range.from],
    queryFn: () =>
      kpiFn({
        data: {
          tenant_id: activeTenantId!,
          branch_id: branchId,
          day_start: range.from,
          day_end: range.to,
        },
      }),
    enabled: !!activeTenantId,
    refetchInterval: 15_000,
  });

  const queuesQ = useQuery({
    queryKey: [
      "queues",
      activeTenantId,
      branchId,
      format(date, "yyyy-MM-dd"),
    ],
    queryFn: () =>
      queuesFn({
        data: {
          tenant_id: activeTenantId!,
          branch_id: branchId,
          queue_date: format(date, "yyyy-MM-dd"),
        },
      }),
    enabled: !!activeTenantId,
  });
  const queues = queuesQ.data?.rows ?? [];

  const tokensQ = useQuery({
    queryKey: ["queue-tokens", activeTenantId, queueId, branchId],
    queryFn: () =>
      tokensFn({
        data: {
          tenant_id: activeTenantId!,
          queue_id: queueId,
          branch_id: branchId,
        },
      }),
    enabled: !!activeTenantId,
    refetchInterval: 10_000,
  });
  const tokens = tokensQ.data?.rows ?? [];

  // Realtime — invalidate on queue_tokens change
  useEffect(() => {
    if (!activeTenantId) return;
    const channel = supabase
      .channel(`queue-tokens-${activeTenantId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "queue_tokens" },
        () => {
          qc.invalidateQueries({ queryKey: ["queue-tokens"] });
          qc.invalidateQueries({ queryKey: ["queue-kpis"] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeTenantId, qc]);

  const callNextFn = useServerFn(callNextInQueue);
  const skipFn = useServerFn(skipQueueToken);
  const recallFn = useServerFn(recallQueueToken);
  const transferFn = useServerFn(transferQueueToken);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["queue-tokens"] });
    qc.invalidateQueries({ queryKey: ["queue-kpis"] });
  };

  const callNextM = useMutation({
    mutationFn: (qId: string) =>
      callNextFn({
        data: { tenant_id: activeTenantId!, queue_id: qId },
      }),
    onSuccess: () => {
      toast.success("Called next token");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const skipM = useMutation({
    mutationFn: (tokenId: string) =>
      skipFn({
        data: { tenant_id: activeTenantId!, token_id: tokenId },
      }),
    onSuccess: invalidate,
  });
  const recallM = useMutation({
    mutationFn: (tokenId: string) =>
      recallFn({
        data: { tenant_id: activeTenantId!, token_id: tokenId },
      }),
    onSuccess: invalidate,
  });
  const transferM = useMutation({
    mutationFn: (args: { tokenId: string; targetQueueId: string }) =>
      transferFn({
        data: {
          tenant_id: activeTenantId!,
          token_id: args.tokenId,
          target_queue_id: args.targetQueueId,
        },
      }),
    onSuccess: () => {
      toast.success("Transferred");
      invalidate();
    },
  });

  const kpis = kpiQ.data;

  const KPI_TILES: {
    key: "waiting" | "called" | "in_consultation" | "completed" | "avg_wait_minutes" | "sla_alerts" | "no_show";
    label: string;
    Icon: typeof Users;
    tone: string;
  }[] = [
    { key: "waiting", label: "Waiting", Icon: Users, tone: "text-amber-600" },
    { key: "called", label: "Called", Icon: PhoneCall, tone: "text-blue-600" },
    {
      key: "in_consultation",
      label: "In Consultation",
      Icon: Stethoscope,
      tone: "text-emerald-600",
    },
    {
      key: "completed",
      label: "Completed",
      Icon: CheckCircle2,
      tone: "text-emerald-700",
    },
    {
      key: "avg_wait_minutes",
      label: "Avg Wait (m)",
      Icon: Timer,
      tone: "text-violet-600",
    },
    {
      key: "sla_alerts",
      label: "SLA Alerts",
      Icon: AlertTriangle,
      tone: "text-rose-600",
    },
    { key: "no_show", label: "No-show", Icon: UserX, tone: "text-rose-500" },
  ];

  return (
    <SchedulerShell
      title="Live Queue"
      subtitle="Realtime queue operations across your branches."
      date={date}
      onDateChange={setDate}
      branchId={branchId}
      onBranchChange={setBranchId}
      quickActions={
        <>
          <Button asChild size="sm" variant="outline">
            <Link to="/scheduling/reception">Reception</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link to="/scheduling/checkin">Check-in</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link to="/scheduling/token-display">
              <MonitorPlay className="mr-2 h-4 w-4" />
              TV Display
            </Link>
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7">
        {KPI_TILES.map(({ key, label, Icon, tone }) => (
          <Card key={key}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="text-xs uppercase text-muted-foreground">
                  {label}
                </div>
                <Icon className={`h-4 w-4 ${tone}`} />
              </div>
              <div className="mt-2 text-2xl font-semibold tabular-nums">
                {kpiQ.isLoading ? "…" : (kpis?.[key] ?? 0)}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={tab} onValueChange={setTab} className="mt-4">
        <TabsList>
          <TabsTrigger value="branch">Branch Queue</TabsTrigger>
          <TabsTrigger value="doctor">Doctor</TabsTrigger>
          <TabsTrigger value="department">Department</TabsTrigger>
          <TabsTrigger value="service">Service</TabsTrigger>
        </TabsList>
        {(["branch", "doctor", "department", "service"] as const).map((t) => (
          <TabsContent key={t} value={t} className="mt-4">
            <div className="mb-3 flex items-center gap-2">
              <Select
                value={queueId ?? "__all"}
                onValueChange={(v) => setQueueId(v === "__all" ? null : v)}
              >
                <SelectTrigger className="h-9 w-[260px]">
                  <SelectValue placeholder="All queues" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">All queues</SelectItem>
                  {queues
                    .filter((q) => t === "branch" || q.queue_type === t)
                    .map((q) => (
                      <SelectItem key={q.id} value={q.id}>
                        {q.name} · {q.code}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {queues
                .filter((q) => t === "branch" || q.queue_type === t)
                .filter((q) => !queueId || q.id === queueId)
                .map((q) => {
                  const qTokens = tokens.filter((tk) => tk.queue_id === q.id);
                  const waiting = qTokens.filter(
                    (tk) =>
                      tk.status === "waiting" || tk.status === "recalled",
                  );
                  const nowServing = qTokens.find(
                    (tk) =>
                      tk.status === "called" ||
                      tk.status === "in_service" ||
                      tk.status === "in_consultation",
                  );
                  return (
                    <Card key={q.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-medium">{q.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {q.code} · {q.queue_type}
                            </div>
                          </div>
                          <Badge variant="outline">{q.status}</Badge>
                        </div>
                        <div className="mt-3 flex items-center gap-3 text-sm">
                          <div>
                            <div className="text-xs text-muted-foreground">
                              Now serving
                            </div>
                            <div className="text-xl font-semibold tabular-nums">
                              {nowServing?.token_label ?? "—"}
                            </div>
                          </div>
                          <div className="ml-auto text-right">
                            <div className="text-xs text-muted-foreground">
                              Waiting
                            </div>
                            <div className="text-xl font-semibold tabular-nums">
                              {waiting.length}
                            </div>
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            onClick={() => callNextM.mutate(q.id)}
                            disabled={callNextM.isPending || waiting.length === 0}
                          >
                            <PhoneCall className="mr-1 h-4 w-4" /> Call next
                          </Button>
                          {nowServing && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => recallM.mutate(nowServing.id)}
                              >
                                <RotateCcw className="mr-1 h-4 w-4" /> Recall
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => skipM.mutate(nowServing.id)}
                              >
                                <SkipForward className="mr-1 h-4 w-4" /> Skip
                              </Button>
                            </>
                          )}
                        </div>
                        <div className="mt-4 border-t pt-3">
                          <div className="mb-2 text-xs uppercase text-muted-foreground">
                            Waiting queue
                          </div>
                          <ul className="space-y-1 max-h-56 overflow-auto">
                            {waiting.slice(0, 20).map((tk) => (
                              <li
                                key={tk.id}
                                className="flex items-center justify-between text-sm"
                              >
                                <span className="tabular-nums font-medium">
                                  {tk.token_label}
                                </span>
                                <div className="flex items-center gap-1">
                                  {tk.priority > 0 && (
                                    <Badge variant="secondary">
                                      P{tk.priority}
                                    </Badge>
                                  )}
                                  <Select
                                    onValueChange={(target) =>
                                      transferM.mutate({
                                        tokenId: tk.id,
                                        targetQueueId: target,
                                      })
                                    }
                                  >
                                    <SelectTrigger className="h-7 w-[36px] border-none p-0">
                                      <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {queues
                                        .filter((qq) => qq.id !== q.id)
                                        .map((qq) => (
                                          <SelectItem key={qq.id} value={qq.id}>
                                            Move to {qq.name}
                                          </SelectItem>
                                        ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </li>
                            ))}
                            {waiting.length === 0 && (
                              <li className="text-xs text-muted-foreground">
                                Empty
                              </li>
                            )}
                          </ul>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              {queues.length === 0 && (
                <Card>
                  <CardContent className="p-6 text-sm text-muted-foreground">
                    No queues configured for this branch/date.
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </SchedulerShell>
  );
}

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { subDays, startOfDay, endOfDay, format } from "date-fns";
import { Plus, Bell, Trash2, Save } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
import {
  listCommunicationPolicies,
  upsertCommunicationPolicy,
  deleteCommunicationPolicy,
} from "@/lib/scheduling/communication-policy.functions";
import { listAppointmentReminders } from "@/lib/scheduling/reminders.functions";

export const Route = createFileRoute(
  "/_authenticated/scheduling/integrations/reminders",
)({
  component: RemindersPage,
});

type Draft = {
  id?: string;
  code: string;
  name: string;
  scope: "tenant" | "branch" | "service";
  channels_order: string; // comma separated
  reminder_offsets_minutes: string; // comma separated
  quiet_hours_start: string;
  quiet_hours_end: string;
  retry_max_attempts: number;
  retry_backoff_minutes: number;
  language: string;
  is_active: boolean;
};

const EMPTY: Draft = {
  code: "",
  name: "",
  scope: "tenant",
  channels_order: "whatsapp,sms,email,push",
  reminder_offsets_minutes: "1440,120,30",
  quiet_hours_start: "",
  quiet_hours_end: "",
  retry_max_attempts: 3,
  retry_backoff_minutes: 15,
  language: "en",
  is_active: true,
};

function RemindersPage() {
  const { activeTenantId } = useTenant();
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [date, setDate] = useState<Date>(new Date());

  const range = useMemo(
    () => ({
      from: startOfDay(subDays(date, 6)).toISOString(),
      to: endOfDay(date).toISOString(),
    }),
    [date],
  );

  const listFn = useServerFn(listCommunicationPolicies);
  const upsertFn = useServerFn(upsertCommunicationPolicy);
  const deleteFn = useServerFn(deleteCommunicationPolicy);
  const remindersFn = useServerFn(listAppointmentReminders);

  const policiesQ = useQuery({
    queryKey: ["comm-policies", activeTenantId],
    queryFn: () =>
      listFn({ data: { tenant_id: activeTenantId! } }),
    enabled: !!activeTenantId,
  });
  const remindersQ = useQuery({
    queryKey: ["reminders-log", activeTenantId, range.from],
    queryFn: () =>
      remindersFn({
        data: {
          tenant_id: activeTenantId!,
          from: range.from,
          to: range.to,
          limit: 200,
        },
      }),
    enabled: !!activeTenantId,
    refetchInterval: 20_000,
  });

  const upsertM = useMutation({
    mutationFn: () =>
      upsertFn({
        data: {
          id: draft.id,
          tenant_id: activeTenantId!,
          code: draft.code,
          name: draft.name,
          scope: draft.scope,
          channels_order: draft.channels_order
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          reminder_offsets_minutes: draft.reminder_offsets_minutes
            .split(",")
            .map((s) => Number(s.trim()))
            .filter((n) => Number.isFinite(n) && n > 0),
          templates: {},
          quiet_hours_start: draft.quiet_hours_start || null,
          quiet_hours_end: draft.quiet_hours_end || null,
          retry_max_attempts: draft.retry_max_attempts,
          retry_backoff_minutes: draft.retry_backoff_minutes,
          language: draft.language,
          respect_person_preferences: true,
          is_active: draft.is_active,
          priority: 100,
        },
      }),
    onSuccess: () => {
      toast.success("Policy saved");
      setDraft(EMPTY);
      qc.invalidateQueries({ queryKey: ["comm-policies"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteM = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["comm-policies"] });
    },
  });

  const policies = policiesQ.data?.rows ?? [];
  const reminders = remindersQ.data?.rows ?? [];

  return (
    <SchedulerShell
      title="Reminder Automation"
      subtitle="Configure per-tenant reminder policies and monitor the outbound log."
      date={date}
      onDateChange={setDate}
    >
      <div className="grid gap-4 lg:grid-cols-[1fr_420px]">
        <Card>
          <CardContent className="p-0">
            <div className="border-b px-4 py-3 text-sm font-medium">
              Communication policies ({policies.length})
            </div>
            <ul className="divide-y">
              {policies.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">
                      {p.name}
                      <Badge variant="outline" className="ml-2">
                        {p.scope}
                      </Badge>
                      {!p.is_active && (
                        <Badge variant="secondary" className="ml-1">
                          inactive
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {p.code} · offsets {(p.reminder_offsets_minutes as number[])?.join(", ")}m
                      · channels {(p.channels_order as string[])?.join(" → ")}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setDraft({
                          id: p.id,
                          code: p.code,
                          name: p.name,
                          scope: p.scope as Draft["scope"],
                          channels_order: (p.channels_order as string[]).join(","),
                          reminder_offsets_minutes: (p.reminder_offsets_minutes as number[]).join(","),
                          quiet_hours_start: p.quiet_hours_start ?? "",
                          quiet_hours_end: p.quiet_hours_end ?? "",
                          retry_max_attempts: p.retry_max_attempts,
                          retry_backoff_minutes: p.retry_backoff_minutes,
                          language: p.language,
                          is_active: p.is_active,
                        })
                      }
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteM.mutate(p.id)}
                    >
                      <Trash2 className="h-4 w-4 text-rose-600" />
                    </Button>
                  </div>
                </li>
              ))}
              {policies.length === 0 && !policiesQ.isLoading && (
                <li className="p-6 text-sm text-muted-foreground text-center">
                  No policies yet — the system-wide defaults apply.
                </li>
              )}
            </ul>
          </CardContent>

          <div className="mt-4 border-t p-4 space-y-3">
            <div className="text-sm font-medium">
              {draft.id ? "Edit policy" : "New policy"}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <div className="text-xs mb-1">Code</div>
                <Input
                  value={draft.code}
                  onChange={(e) => setDraft({ ...draft, code: e.target.value })}
                  placeholder="tenant_default"
                />
              </div>
              <div>
                <div className="text-xs mb-1">Name</div>
                <Input
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  placeholder="Tenant default policy"
                />
              </div>
              <div>
                <div className="text-xs mb-1">Scope</div>
                <Select
                  value={draft.scope}
                  onValueChange={(v) =>
                    setDraft({ ...draft, scope: v as Draft["scope"] })
                  }
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tenant">Tenant</SelectItem>
                    <SelectItem value="branch">Branch</SelectItem>
                    <SelectItem value="service">Service</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <div className="text-xs mb-1">Language</div>
                <Input
                  value={draft.language}
                  onChange={(e) => setDraft({ ...draft, language: e.target.value })}
                  placeholder="en"
                />
              </div>
              <div className="sm:col-span-2">
                <div className="text-xs mb-1">Channels order (WhatsApp → SMS → Email → Push)</div>
                <Textarea
                  rows={1}
                  value={draft.channels_order}
                  onChange={(e) => setDraft({ ...draft, channels_order: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <div className="text-xs mb-1">Reminder offsets before appointment (minutes)</div>
                <Textarea
                  rows={1}
                  value={draft.reminder_offsets_minutes}
                  onChange={(e) => setDraft({ ...draft, reminder_offsets_minutes: e.target.value })}
                  placeholder="1440, 120, 30"
                />
              </div>
              <div>
                <div className="text-xs mb-1">Quiet hours start (HH:MM)</div>
                <Input
                  value={draft.quiet_hours_start}
                  onChange={(e) => setDraft({ ...draft, quiet_hours_start: e.target.value })}
                  placeholder="21:00"
                />
              </div>
              <div>
                <div className="text-xs mb-1">Quiet hours end (HH:MM)</div>
                <Input
                  value={draft.quiet_hours_end}
                  onChange={(e) => setDraft({ ...draft, quiet_hours_end: e.target.value })}
                  placeholder="08:00"
                />
              </div>
              <div>
                <div className="text-xs mb-1">Retry max attempts</div>
                <Input
                  type="number"
                  value={draft.retry_max_attempts}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      retry_max_attempts: Number(e.target.value),
                    })
                  }
                />
              </div>
              <div>
                <div className="text-xs mb-1">Retry backoff (min)</div>
                <Input
                  type="number"
                  value={draft.retry_backoff_minutes}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      retry_backoff_minutes: Number(e.target.value),
                    })
                  }
                />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                onClick={() => upsertM.mutate()}
                disabled={upsertM.isPending || !draft.code || !draft.name}
              >
                {draft.id ? (
                  <>
                    <Save className="mr-2 h-4 w-4" /> Save policy
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" /> Create policy
                  </>
                )}
              </Button>
              {draft.id && (
                <Button variant="outline" onClick={() => setDraft(EMPTY)}>
                  Cancel edit
                </Button>
              )}
            </div>
          </div>
        </Card>

        <Card>
          <CardContent className="p-0">
            <div className="border-b px-4 py-3 text-sm font-medium">
              Reminder log (7d)
            </div>
            <ul className="divide-y max-h-[720px] overflow-auto">
              {reminders.map((r) => (
                <li key={r.id} className="px-4 py-2 text-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bell className="h-3 w-3 text-muted-foreground" />
                      <span className="capitalize">{r.channel}</span>
                      <span className="text-xs text-muted-foreground">
                        {r.template_code}
                      </span>
                    </div>
                    <Badge
                      variant={
                        r.status === "sent"
                          ? "secondary"
                          : r.status === "failed"
                            ? "destructive"
                            : "outline"
                      }
                    >
                      {r.status}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    scheduled {format(new Date(r.scheduled_at), "PPp")}
                    {r.attempt_no ? ` · attempt ${r.attempt_no}` : ""}
                  </div>
                  {r.last_error && (
                    <div className="text-xs text-rose-600 truncate">
                      {r.last_error}
                    </div>
                  )}
                </li>
              ))}
              {reminders.length === 0 && (
                <li className="p-6 text-sm text-muted-foreground text-center">
                  No reminders in this window.
                </li>
              )}
            </ul>
          </CardContent>
        </Card>
      </div>
    </SchedulerShell>
  );
}

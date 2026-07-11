import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  CalendarPlus,
  Power,
  Trash2,
  RefreshCcw,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { SchedulerShell } from "@/components/scheduling/scheduler-shell";
import { useTenant } from "@/hooks/use-tenant";
import {
  listCalendarAccounts,
  connectCalendarAccount,
  setCalendarSyncEnabled,
  disconnectCalendarAccount,
  listCalendarSyncJobs,
} from "@/lib/scheduling/calendar.functions";

export const Route = createFileRoute(
  "/_authenticated/scheduling/integrations/calendar",
)({
  component: CalendarIntegrationsPage,
});

function CalendarIntegrationsPage() {
  const { activeTenantId } = useTenant();
  const qc = useQueryClient();

  const listAccountsFn = useServerFn(listCalendarAccounts);
  const listJobsFn = useServerFn(listCalendarSyncJobs);
  const connectFn = useServerFn(connectCalendarAccount);
  const toggleFn = useServerFn(setCalendarSyncEnabled);
  const disconnectFn = useServerFn(disconnectCalendarAccount);

  const accountsQ = useQuery({
    queryKey: ["calendar-accounts", activeTenantId],
    queryFn: () =>
      listAccountsFn({ data: { tenant_id: activeTenantId! } }),
    enabled: !!activeTenantId,
  });
  const jobsQ = useQuery({
    queryKey: ["calendar-jobs", activeTenantId],
    queryFn: () =>
      listJobsFn({ data: { tenant_id: activeTenantId! } }),
    enabled: !!activeTenantId,
    refetchInterval: 15_000,
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [provider, setProvider] = useState<"google" | "outlook">("google");
  const [providerAccountId, setProviderAccountId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [syncDirection, setSyncDirection] = useState<
    "push" | "pull" | "two_way"
  >("push");

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["calendar-accounts"] });
    qc.invalidateQueries({ queryKey: ["calendar-jobs"] });
  };

  const connectM = useMutation({
    mutationFn: () =>
      connectFn({
        data: {
          tenant_id: activeTenantId!,
          provider,
          provider_account_id: providerAccountId,
          display_name: displayName || null,
          sync_direction: syncDirection,
        },
      }),
    onSuccess: () => {
      toast.success("Calendar connected");
      setDialogOpen(false);
      setProviderAccountId("");
      setDisplayName("");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleM = useMutation({
    mutationFn: (args: { id: string; enabled: boolean }) =>
      toggleFn({ data: args }),
    onSuccess: invalidate,
  });
  const disconnectM = useMutation({
    mutationFn: (id: string) => disconnectFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Disconnected");
      invalidate();
    },
  });

  const accounts = accountsQ.data?.rows ?? [];
  const jobs = jobsQ.data?.rows ?? [];

  return (
    <SchedulerShell
      title="Calendar Integration Center"
      subtitle="Connect Google or Outlook calendars, monitor sync health and retry failures."
      quickActions={
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <CalendarPlus className="mr-2 h-4 w-4" /> Connect calendar
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Connect a calendar</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <div className="text-xs mb-1">Provider</div>
                <Select value={provider} onValueChange={(v) => setProvider(v as never)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="google">Google Calendar</SelectItem>
                    <SelectItem value="outlook">Microsoft Outlook</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <div className="text-xs mb-1">Provider account (email or ID)</div>
                <Input
                  value={providerAccountId}
                  onChange={(e) => setProviderAccountId(e.target.value)}
                  placeholder="doctor@example.com"
                />
              </div>
              <div>
                <div className="text-xs mb-1">Display name</div>
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Dr Sharma — Google"
                />
              </div>
              <div>
                <div className="text-xs mb-1">Sync direction</div>
                <Select value={syncDirection} onValueChange={(v) => setSyncDirection(v as never)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="push">Push only (Lovable → provider)</SelectItem>
                    <SelectItem value="pull">Pull only (provider → Lovable)</SelectItem>
                    <SelectItem value="two_way">Two-way</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => connectM.mutate()}
                disabled={connectM.isPending || !providerAccountId}
              >
                Connect
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      }
    >
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardContent className="p-0">
            <div className="border-b px-4 py-3 text-sm font-medium">
              Connected accounts ({accounts.length})
            </div>
            <ul className="divide-y">
              {accounts.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">
                      {a.display_name ?? a.provider_account_id}
                      <Badge variant="outline" className="ml-2 capitalize">
                        {a.provider}
                      </Badge>
                      {a.last_sync_status === "success" && (
                        <Badge className="ml-1" variant="secondary">
                          <CheckCircle2 className="mr-1 h-3 w-3" /> healthy
                        </Badge>
                      )}
                      {a.last_sync_status === "failed" && (
                        <Badge className="ml-1" variant="destructive">
                          <AlertTriangle className="mr-1 h-3 w-3" /> failing
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {a.provider_account_id} · {a.sync_direction}
                      {a.last_sync_at &&
                        ` · last synced ${format(new Date(a.last_sync_at), "PPp")}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        toggleM.mutate({ id: a.id, enabled: !a.sync_enabled })
                      }
                    >
                      <Power className="mr-1 h-4 w-4" />
                      {a.sync_enabled ? "Disable" : "Enable"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => disconnectM.mutate(a.id)}
                    >
                      <Trash2 className="h-4 w-4 text-rose-600" />
                    </Button>
                  </div>
                </li>
              ))}
              {accounts.length === 0 && !accountsQ.isLoading && (
                <li className="p-6 text-sm text-muted-foreground text-center">
                  No calendars connected yet.
                </li>
              )}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <div className="border-b px-4 py-3 flex items-center justify-between">
              <div className="text-sm font-medium">Sync queue</div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  qc.invalidateQueries({ queryKey: ["calendar-jobs"] })
                }
              >
                <RefreshCcw className="h-4 w-4" />
              </Button>
            </div>
            <ul className="divide-y max-h-[520px] overflow-auto">
              {jobs.map((j) => (
                <li key={j.id} className="px-4 py-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs truncate">
                      {j.job_type}
                    </span>
                    <Badge
                      variant={
                        j.status === "succeeded"
                          ? "secondary"
                          : j.status === "failed"
                            ? "destructive"
                            : "outline"
                      }
                    >
                      {j.status}
                    </Badge>
                  </div>
                  {j.last_error && (
                    <div className="text-xs text-rose-600 truncate">
                      {j.last_error}
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground">
                    {format(new Date(j.created_at), "PPp")}
                    {j.attempts ? ` · attempts ${j.attempts}` : ""}
                  </div>
                </li>
              ))}
              {jobs.length === 0 && (
                <li className="p-6 text-sm text-muted-foreground text-center">
                  No sync jobs yet.
                </li>
              )}
            </ul>
          </CardContent>
        </Card>
      </div>
    </SchedulerShell>
  );
}

/** Patient Portal — Settings workspace (security, app prefs, sessions, devices). */
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Monitor, LogOut } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { listPortalSessions, revokePortalSession } from "@/lib/patient/sessions.functions";
import { formatDateTime } from "@/lib/standards-format";
import { PatientShell } from "./shell";
import {
  CommunicationPreferences,
  DashboardPreferences,
  ThemePreferences,
} from "./profile";

type Sess = { id: string; device?: string | null; user_agent?: string | null; last_active_at?: string | null; created_at: string; ip?: string | null; is_current?: boolean };

export function SecuritySettings() {
  const qc = useQueryClient();
  const listFn = useServerFn(listPortalSessions);
  const revFn = useServerFn(revokePortalSession);
  const q = useQuery<Sess[]>({ queryKey: ["patient-sessions"], queryFn: () => listFn({}) as unknown as Promise<Sess[]> });
  const revoke = useMutation({
    mutationFn: (sessionId: string) => revFn({ data: { sessionId } }),
    onSuccess: () => { toast.success("Session revoked"); qc.invalidateQueries({ queryKey: ["patient-sessions"] }); },
  });
  const rows = q.data ?? [];
  return (
    <Card>
      <CardHeader><CardTitle className="text-sm">Active Sessions</CardTitle></CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <div className="text-xs text-muted-foreground">No active sessions.</div>
        ) : (
          <ul className="divide-y">
            {rows.map((s) => (
              <li key={s.id} className="py-2 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm flex items-center gap-2">
                    <Monitor className="h-4 w-4" />{s.device ?? s.user_agent ?? "Session"}
                    {s.is_current && <Badge variant="outline">this device</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground">Last active {formatDateTime(s.last_active_at ?? s.created_at)} · {s.ip ?? ""}</div>
                </div>
                {!s.is_current && (
                  <Button size="sm" variant="outline" onClick={() => revoke.mutate(s.id)} disabled={revoke.isPending}>
                    <LogOut className="h-3.5 w-3.5 mr-1.5" />Revoke
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function AppPreferences() { return <DashboardPreferences />; }
export function ThemeSelector() { return <ThemePreferences />; }

export function PatientSettingsWorkspace() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <SecuritySettings />
      <CommunicationPreferences />
      <ThemeSelector />
      <AppPreferences />
    </div>
  );
}

export function PatientSettingsPage() {
  return (
    <PatientShell title="Settings" description="Security, appearance and preferences.">
      <PatientSettingsWorkspace />
    </PatientShell>
  );
}

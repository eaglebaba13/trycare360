/** Patient Portal — Notifications workspace. */
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DataGrid } from "@/components/standards/data-grid";
import {
  getNotificationPreferences,
  listNotificationHistory,
  registerPushToken,
  removePushToken,
  updateNotificationPreferences,
} from "@/lib/patient/notifications.functions";
import { formatDateTime } from "@/lib/standards-format";
import { PatientShell } from "./shell";

type Pref = { id: string; category: string; channel: string; enabled: boolean };
type Note = { id: string; subject?: string | null; title?: string | null; body?: string | null; sent_at?: string | null; created_at?: string; channel?: string | null; status?: string | null };
type Device = { id: string; provider: string; device_id?: string | null; created_at: string };

export function NotificationHistory() {
  const fn = useServerFn(listNotificationHistory);
  const q = useQuery<Note[]>({ queryKey: ["patient-notif-history"], queryFn: () => fn({ data: {} }) as unknown as Promise<Note[]> });
  return (
    <DataGrid rows={q.data ?? []} getRowId={(r) => r.id} isLoading={q.isLoading} emptyMessage="No notifications yet."
      columns={[
        { id: "when", header: "When", cell: (r) => formatDateTime(r.sent_at ?? r.created_at ?? "") },
        { id: "ch", header: "Channel", cell: (r) => r.channel ?? "—" },
        { id: "subj", header: "Subject", cell: (r) => r.subject ?? r.title ?? "—" },
        { id: "status", header: "Status", cell: (r) => r.status ? <Badge variant="outline">{r.status}</Badge> : "—" },
      ]} />
  );
}

export function NotificationPreferences() {
  const qc = useQueryClient();
  const getFn = useServerFn(getNotificationPreferences);
  const upFn = useServerFn(updateNotificationPreferences);
  const q = useQuery<Pref[]>({ queryKey: ["patient-notif-prefs"], queryFn: () => getFn({}) as unknown as Promise<Pref[]> });
  const mut = useMutation({
    mutationFn: (p: { category: string; channel: string; enabled: boolean }) => upFn({ data: p }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["patient-notif-prefs"] }),
    onError: (e: Error) => toast.error(e.message),
  });
  const rows = q.data ?? [];
  if (rows.length === 0) return <div className="text-sm text-muted-foreground py-6 text-center">No preferences configured.</div>;
  return (
    <ul className="divide-y">
      {rows.map((p) => (
        <li key={p.id} className="py-2 flex items-center justify-between gap-3">
          <div className="text-sm">
            <span className="font-medium">{p.category}</span>
            <span className="text-muted-foreground"> · {p.channel}</span>
          </div>
          <Switch checked={p.enabled} onCheckedChange={(v) => mut.mutate({ category: p.category, channel: p.channel, enabled: v })} />
        </li>
      ))}
    </ul>
  );
}

export function PushDeviceGrid() {
  const qc = useQueryClient();
  const regFn = useServerFn(registerPushToken);
  const rmFn = useServerFn(removePushToken);
  const [form, setForm] = useState({ provider: "fcm", token: "", deviceId: "" });
  const list = useQuery<Device[]>({ queryKey: ["patient-devices"], queryFn: () => Promise.resolve([]) });
  const add = useMutation({
    mutationFn: () => regFn({ data: form }),
    onSuccess: () => { toast.success("Device registered"); qc.invalidateQueries({ queryKey: ["patient-devices"] }); setForm({ ...form, token: "", deviceId: "" }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: (deviceId: string) => rmFn({ data: { deviceId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["patient-devices"] }),
  });
  return (
    <div className="space-y-3">
      <div className="grid gap-2 md:grid-cols-4 items-end">
        <div><Label>Provider</Label><Input value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })} /></div>
        <div><Label>Token</Label><Input value={form.token} onChange={(e) => setForm({ ...form, token: e.target.value })} /></div>
        <div><Label>Device ID</Label><Input value={form.deviceId} onChange={(e) => setForm({ ...form, deviceId: e.target.value })} /></div>
        <Button onClick={() => add.mutate()} disabled={add.isPending || !form.token}>Register</Button>
      </div>
      <DataGrid rows={list.data ?? []} getRowId={(r) => r.id} emptyMessage="No devices registered."
        columns={[
          { id: "prov", header: "Provider", cell: (r) => r.provider },
          { id: "dev", header: "Device", cell: (r) => r.device_id ?? "—" },
          { id: "act", header: "", cell: (r) => <Button size="sm" variant="outline" onClick={() => remove.mutate(r.device_id ?? r.id)}>Remove</Button>, className: "text-right" },
        ]} />
    </div>
  );
}

export function PatientNotificationsPage() {
  return (
    <PatientShell title="Notifications" description="History, preferences and push devices.">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card><CardHeader><CardTitle className="text-sm">History</CardTitle></CardHeader><CardContent><NotificationHistory /></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Preferences</CardTitle></CardHeader><CardContent><NotificationPreferences /></CardContent></Card>
        <Card className="lg:col-span-2"><CardHeader><CardTitle className="text-sm">Push Devices</CardTitle></CardHeader><CardContent><PushDeviceGrid /></CardContent></Card>
      </div>
    </PatientShell>
  );
}

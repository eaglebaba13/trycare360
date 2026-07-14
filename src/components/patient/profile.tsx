/** Patient Portal — Profile workspace. */
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  getMyPatientProfile,
  updateMyPatientProfile,
  getMySettings,
  updateMySettings,
} from "@/lib/patient/profile.functions";
import { PatientShell } from "./shell";

type Profile = {
  display_name: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  bio: string | null;
  locale: string | null;
  timezone: string | null;
} | null;

export function ProfileEditor() {
  const qc = useQueryClient();
  const getFn = useServerFn(getMyPatientProfile);
  const updateFn = useServerFn(updateMyPatientProfile);
  const q = useQuery({ queryKey: ["patient-portal-profile"], queryFn: () => getFn({}) });
  const p = (q.data as { profile: Profile } | undefined)?.profile;
  const [form, setForm] = useState({ displayName: "", bio: "", locale: "", timezone: "", avatarUrl: "" });
  useEffect(() => {
    if (p) setForm({
      displayName: p.display_name ?? "", bio: p.bio ?? "",
      locale: p.locale ?? "", timezone: p.timezone ?? "", avatarUrl: p.avatar_url ?? "",
    });
  }, [p]);
  const mut = useMutation({
    mutationFn: () => updateFn({ data: {
      displayName: form.displayName || null,
      bio: form.bio || null,
      locale: form.locale || null,
      timezone: form.timezone || null,
      avatarUrl: form.avatarUrl || null,
    } }),
    onSuccess: () => { toast.success("Profile saved"); qc.invalidateQueries({ queryKey: ["patient-portal-profile"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Card>
      <CardHeader><CardTitle className="text-sm">Profile</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 md:grid-cols-2">
          <div><Label>Display Name</Label><Input value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} /></div>
          <div><Label>Avatar URL</Label><Input value={form.avatarUrl} onChange={(e) => setForm({ ...form, avatarUrl: e.target.value })} /></div>
          <div><Label>Locale</Label><Input value={form.locale} onChange={(e) => setForm({ ...form, locale: e.target.value })} placeholder="en-IN" /></div>
          <div><Label>Timezone</Label><Input value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })} placeholder="Asia/Kolkata" /></div>
        </div>
        <div><Label>Bio</Label><Textarea rows={3} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} /></div>
        <div className="flex justify-end"><Button onClick={() => mut.mutate()} disabled={mut.isPending}>Save</Button></div>
      </CardContent>
    </Card>
  );
}

export function EmergencyContactCard() {
  return (
    <Card>
      <CardHeader><CardTitle className="text-sm">Emergency Contact</CardTitle></CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        Manage emergency contacts through the Health Passport workspace.
      </CardContent>
    </Card>
  );
}

function PrefCard({ title, description }: { title: string; description: string }) {
  const qc = useQueryClient();
  const getFn = useServerFn(getMySettings);
  const updateFn = useServerFn(updateMySettings);
  const q = useQuery({ queryKey: ["patient-settings"], queryFn: () => getFn({}) });
  const settings = ((q.data as { settings: { settings?: Record<string, unknown> } | null } | undefined)?.settings?.settings ?? {}) as Record<string, unknown>;
  const [text, setText] = useState("");
  useEffect(() => { setText(JSON.stringify(settings, null, 2)); }, [q.data]);
  const mut = useMutation({
    mutationFn: async () => {
      let parsed: Record<string, unknown>;
      try { parsed = JSON.parse(text) as Record<string, unknown>; }
      catch { throw new Error("Invalid JSON"); }
      return updateFn({ data: { settings: parsed } });
    },
    onSuccess: () => { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["patient-settings"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Card>
      <CardHeader><CardTitle className="text-sm">{title}</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <p className="text-xs text-muted-foreground">{description}</p>
        <Textarea rows={5} value={text} onChange={(e) => setText(e.target.value)} className="font-mono text-xs" />
        <div className="flex justify-end"><Button size="sm" onClick={() => mut.mutate()} disabled={mut.isPending}>Save</Button></div>
      </CardContent>
    </Card>
  );
}

export function CommunicationPreferences() { return <PrefCard title="Communication Preferences" description="Channels, quiet hours (JSON)." />; }
export function ThemePreferences() { return <PrefCard title="Theme Preferences" description="Theme, density (JSON)." />; }
export function DashboardPreferences() { return <PrefCard title="Dashboard Preferences" description="Card order (JSON)." />; }

export function PatientProfileWorkspace() {
  return (
    <PatientShell title="Profile" description="Your personal details and preferences.">
      <div className="grid gap-4 lg:grid-cols-2">
        <ProfileEditor />
        <EmergencyContactCard />
        <CommunicationPreferences />
        <ThemePreferences />
        <DashboardPreferences />
      </div>
    </PatientShell>
  );
}

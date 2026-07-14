/** Patient Portal — Health Passport & emergency summary. */
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { QrCode, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  getMyHealthPassport,
  updateHealthPassportVisibility,
} from "@/lib/patient/passport.functions";
import { listMyConsents } from "@/lib/patient/consent.functions";
import { formatDate } from "@/lib/standards-format";
import { PatientShell } from "./shell";

type Passport = {
  blood_group?: string | null; allergies?: string[] | null; conditions?: string[] | null;
  medications?: string[] | null; emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null; is_public?: boolean | null;
} | null;

export function EmergencySummary() {
  const fn = useServerFn(getMyHealthPassport);
  const q = useQuery({ queryKey: ["patient-passport"], queryFn: () => fn({ data: {} }) as unknown as Promise<{ passport: Passport }> });
  const p = q.data?.passport;
  return (
    <Card>
      <CardHeader><CardTitle className="text-sm flex items-center gap-2"><ShieldCheck className="h-4 w-4" />Emergency Summary</CardTitle></CardHeader>
      <CardContent className="space-y-2 text-sm">
        <Row label="Blood group" value={p?.blood_group ?? "—"} />
        <Row label="Allergies" value={(p?.allergies ?? []).join(", ") || "None"} />
        <Row label="Conditions" value={(p?.conditions ?? []).join(", ") || "None"} />
        <Row label="Medications" value={(p?.medications ?? []).join(", ") || "None"} />
        <Row label="Emergency contact" value={`${p?.emergency_contact_name ?? "—"} ${p?.emergency_contact_phone ? `· ${p.emergency_contact_phone}` : ""}`} />
      </CardContent>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <div className="text-xs uppercase text-muted-foreground">{label}</div>
      <div className="col-span-2">{value}</div>
    </div>
  );
}

export function QRPlaceholder() {
  return (
    <Card>
      <CardHeader><CardTitle className="text-sm flex items-center gap-2"><QrCode className="h-4 w-4" />Passport QR</CardTitle></CardHeader>
      <CardContent className="text-center py-6">
        <div className="mx-auto h-40 w-40 rounded border border-dashed flex items-center justify-center text-xs text-muted-foreground">QR generated at scan time</div>
      </CardContent>
    </Card>
  );
}

function VisibilityToggle() {
  const qc = useQueryClient();
  const fn = useServerFn(updateHealthPassportVisibility);
  const q = useQuery({ queryKey: ["patient-passport"], queryFn: () => Promise.resolve({}) });
  const passport = (q.data as { passport?: Passport } | undefined)?.passport;
  const mut = useMutation({
    mutationFn: (isPublic: boolean) => fn({ data: { isPublic } }),
    onSuccess: () => { toast.success("Visibility updated"); qc.invalidateQueries({ queryKey: ["patient-passport"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Card>
      <CardHeader><CardTitle className="text-sm">Sharing</CardTitle></CardHeader>
      <CardContent className="flex items-center justify-between">
        <span className="text-sm">Allow emergency responders to view</span>
        <Switch checked={!!passport?.is_public} onCheckedChange={(v) => mut.mutate(v)} />
      </CardContent>
    </Card>
  );
}

export function HealthPassportWorkspace() {
  const consentsFn = useServerFn(listMyConsents);
  const consents = useQuery<{ id: string; type: string; status: string; granted_at?: string | null }[]>({
    queryKey: ["patient-consents"],
    queryFn: () => consentsFn({ data: {} }) as never,
  });
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <EmergencySummary />
        <QRPlaceholder />
      </div>
      <VisibilityToggle />
      <Card>
        <CardHeader><CardTitle className="text-sm">Consents</CardTitle></CardHeader>
        <CardContent>
          {(consents.data ?? []).length === 0 ? (
            <div className="text-xs text-muted-foreground">No consents on record.</div>
          ) : (
            <ul className="divide-y">
              {(consents.data ?? []).map((c) => (
                <li key={c.id} className="py-2 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">{c.type}</div>
                    <div className="text-xs text-muted-foreground">{formatDate(c.granted_at)}</div>
                  </div>
                  <Badge variant="outline">{c.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function PatientPassportPage() {
  return (
    <PatientShell title="Health Passport" description="Emergency-ready health summary.">
      <HealthPassportWorkspace />
    </PatientShell>
  );
}

export function PatientConsentsPage() {
  const fn = useServerFn(listMyConsents);
  const q = useQuery<{ id: string; type: string; status: string; granted_at?: string | null; withdrawn_at?: string | null }[]>({
    queryKey: ["patient-consents"],
    queryFn: () => fn({ data: {} }) as never,
  });
  const rows = q.data ?? [];
  return (
    <PatientShell title="Consents" description="Your digital consent history.">
      <Card><CardContent className="pt-4">
        {rows.length === 0 ? (
          <div className="text-sm text-muted-foreground py-6 text-center">No consents on record.</div>
        ) : (
          <ul className="divide-y">
            {rows.map((c) => (
              <li key={c.id} className="py-2 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">{c.type}</div>
                  <div className="text-xs text-muted-foreground">
                    Granted {formatDate(c.granted_at)}{c.withdrawn_at ? ` · Withdrawn ${formatDate(c.withdrawn_at)}` : ""}
                  </div>
                </div>
                <Badge variant="outline">{c.status}</Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent></Card>
    </PatientShell>
  );
}

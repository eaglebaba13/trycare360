/** Patient Portal — Teleconsult workspace. */
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Video, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  getTeleconsultJoinInfo,
  listMyTeleconsultations,
} from "@/lib/patient/teleconsult.functions";
import { formatDateTime } from "@/lib/standards-format";
import { PatientShell } from "./shell";

type T = { id: string; appointment_id?: string | null; starts_at: string; status?: string | null; provider?: string | null };

export function ConsentBanner() {
  return (
    <Card>
      <CardContent className="pt-4 text-xs text-muted-foreground">
        By joining, you consent to teleconsultation recording and data handling per the platform's clinical policies.
      </CardContent>
    </Card>
  );
}

export function JoinMeetingCard({ session }: { session: T }) {
  const fn = useServerFn(getTeleconsultJoinInfo);
  const mut = useMutation({
    mutationFn: () => fn({ data: { teleconsultationId: session.id } }),
    onSuccess: (r) => {
      const url = (r as { joinUrl?: string; url?: string }).joinUrl ?? (r as { url?: string }).url;
      if (url) window.open(url, "_blank");
    },
  });
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm flex items-center gap-1.5"><Video className="h-4 w-4" />Teleconsult</CardTitle>
          {session.status && <Badge variant="outline">{session.status}</Badge>}
        </div>
        <div className="text-xs text-muted-foreground">{formatDateTime(session.starts_at)}</div>
      </CardHeader>
      <CardContent>
        <Button size="sm" onClick={() => mut.mutate()} disabled={mut.isPending}>
          <ExternalLink className="h-3.5 w-3.5 mr-1.5" />Join
        </Button>
      </CardContent>
    </Card>
  );
}

export function TeleconsultDashboard() {
  const fn = useServerFn(listMyTeleconsultations);
  const q = useQuery<T[]>({ queryKey: ["patient-teleconsult"], queryFn: () => fn({ data: {} }) as unknown as Promise<T[]> });
  const rows = q.data ?? [];
  return (
    <div className="space-y-4">
      <ConsentBanner />
      {rows.length === 0 ? (
        <div className="text-sm text-muted-foreground py-8 text-center">No teleconsultations scheduled.</div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">{rows.map((s) => <JoinMeetingCard key={s.id} session={s} />)}</div>
      )}
    </div>
  );
}

export function PatientTeleconsultPage() {
  return (
    <PatientShell title="Teleconsult" description="Join your video consultations.">
      <TeleconsultDashboard />
    </PatientShell>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getAssessmentSession, analyzeAssessment, convertAssessmentToLead } from "@/lib/assessment/assessment.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Sparkles, UserPlus } from "lucide-react";
import { useTenant } from "@/hooks/use-tenant";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/consultations/$sessionId")({
  component: SessionDetail,
});

function SessionDetail() {
  const { sessionId } = Route.useParams();
  const get = useServerFn(getAssessmentSession);
  const analyze = useServerFn(analyzeAssessment);
  const convert = useServerFn(convertAssessmentToLead);
  const qc = useQueryClient();
  const { activeTenantId } = useTenant();

  const { data, isLoading } = useQuery({
    queryKey: ["assessment", sessionId],
    queryFn: () => get({ data: { session_id: sessionId } }),
  });

  const analyzeM = useMutation({
    mutationFn: () => analyze({ data: { session_id: sessionId } }),
    onSuccess: () => { toast.success("Analysis complete"); qc.invalidateQueries({ queryKey: ["assessment", sessionId] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const convertM = useMutation({
    mutationFn: () => convert({ data: { session_id: sessionId, tenant_id: activeTenantId ?? "" } }),
    onSuccess: () => { toast.success("Converted to lead"); qc.invalidateQueries({ queryKey: ["assessment", sessionId] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading || !data) return <div className="grid h-64 place-items-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  const { session, result, recommendations, photos } = data;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle>{session.contact_name ?? "Anonymous"} — <span className="capitalize">{session.category}</span> consultation</CardTitle>
            <div className="mt-1 text-sm text-muted-foreground">
              {session.contact_phone ?? "—"} · {session.contact_email ?? "—"} · {session.contact_city ?? "—"}
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => analyzeM.mutate()} disabled={analyzeM.isPending}>
              {analyzeM.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />} Re-run AI
            </Button>
            <Button size="sm" onClick={() => convertM.mutate()} disabled={convertM.isPending || !activeTenantId || !!session.person_id}>
              <UserPlus className="mr-2 h-4 w-4" /> {session.person_id ? "Linked" : "Convert to lead"}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {result && (
        <Card>
          <CardHeader><CardTitle>AI Analysis</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="capitalize">Severity: {result.severity}</Badge>
              <Badge variant="outline">Confidence: {result.confidence ?? "—"}%</Badge>
              <Badge variant="outline" className="capitalize">Urgency: {result.urgency ?? "—"}</Badge>
              {result.ai_model && <Badge variant="outline">{result.ai_model}</Badge>}
            </div>
            <p className="text-sm">{result.ai_summary}</p>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Key findings</div>
                <ul className="space-y-1 text-sm">{(result.key_findings as string[] ?? []).map((f, i) => <li key={i}>• {f}</li>)}</ul>
              </div>
              <div>
                <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Probable causes</div>
                <ul className="space-y-1 text-sm">{(result.probable_causes as string[] ?? []).map((f, i) => <li key={i}>• {f}</li>)}</ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Recommendations ({recommendations.length})</CardTitle></CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2">
          {recommendations.map((r) => (
            <div key={r.id} className="rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <Badge variant="secondary" className="capitalize text-xs">{r.kind}</Badge>
                <span className="text-xs text-muted-foreground">P{r.priority}</span>
              </div>
              <div className="mt-1 font-medium">{r.title}</div>
              {r.description && <div className="text-xs text-muted-foreground">{r.description}</div>}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Responses</CardTitle></CardHeader>
        <CardContent>
          <pre className="overflow-auto rounded bg-muted p-3 text-xs">{JSON.stringify(session.responses, null, 2)}</pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Photos ({photos.length})</CardTitle></CardHeader>
        <CardContent>
          {photos.length === 0 ? <div className="text-sm text-muted-foreground">No photos uploaded.</div> : (
            <ul className="space-y-1 text-sm">{photos.map((p) => <li key={p.id}><span className="font-medium capitalize">{p.slot}</span> · <span className="text-xs text-muted-foreground">{p.storage_path}</span></li>)}</ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2, CheckCircle2, AlertTriangle, Stethoscope, Sparkles, Package, TestTube2, Crown, MapPin, Phone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_public/consultation/result/$token")({
  head: () => ({
    meta: [
      { title: "Your AI Consultation Result | TryCare360" },
      { name: "description", content: "Your personalized AI consultation, expert-recommended treatments, products and next steps." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResultPage,
});

type ResultPayload = {
  session: { id: string; status: string; category: string; contact_name?: string | null };
  result: {
    severity: "low" | "moderate" | "high" | "severe";
    confidence?: number;
    urgency?: string;
    scale_scores?: Record<string, unknown>;
    probable_causes?: string[];
    key_findings?: string[];
    ai_summary?: string;
  } | null;
  recommendations: Array<{
    id: string; kind: string; title: string; description?: string | null; reason?: string | null; priority: number;
  }>;
};

const KIND_ICON: Record<string, typeof Stethoscope> = {
  doctor: Stethoscope, treatment: Sparkles, product: Package, test: TestTube2, membership: Crown, subscription: Crown, branch: MapPin,
};
const SEV_STYLES: Record<string, string> = {
  low: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  moderate: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  high: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
  severe: "bg-rose-500/10 text-rose-700 dark:text-rose-400",
};

function ResultPage() {
  const { token } = Route.useParams();
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["assessment-result", token],
    queryFn: async () => {
      const r = await fetch(`/api/public/assessment/result?token=${encodeURIComponent(token)}`);
      return r.json() as Promise<{ ok: boolean } & ResultPayload>;
    },
    refetchInterval: (q) => (q.state.data?.result ? false : 3000),
  });

  if (isLoading || !data?.ok) {
    return <div className="grid min-h-[60vh] place-items-center text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin inline" /> Loading your results…</div>;
  }

  const payload = data as ResultPayload;
  if (!payload.result) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
        <h1 className="mt-4 text-2xl font-semibold">Our AI is analyzing your responses…</h1>
        <p className="mt-2 text-muted-foreground">This usually takes 10-30 seconds. This page will refresh automatically.</p>
        <Button className="mt-6" variant="outline" onClick={() => refetch()}>Refresh now</Button>
      </div>
    );
  }

  const r = payload.result;
  const recs = payload.recommendations;
  const grouped = recs.reduce<Record<string, typeof recs>>((acc, x) => { (acc[x.kind] ??= []).push(x); return acc; }, {});

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <header className="mb-8">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Your {payload.session.category} consultation</p>
        <h1 className="mt-1 text-3xl font-bold sm:text-4xl">{payload.session.contact_name ? `Hi ${payload.session.contact_name.split(" ")[0]},` : "Your personalized plan"}</h1>
        <p className="mt-2 text-muted-foreground">Here's what our AI found and what we recommend next.</p>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className={`rounded-xl border p-4 ${SEV_STYLES[r.severity]}`}>
          <div className="text-xs font-medium uppercase">Severity</div>
          <div className="mt-1 text-2xl font-bold capitalize">{r.severity}</div>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="text-xs font-medium uppercase text-muted-foreground">Confidence</div>
          <div className="mt-1 text-2xl font-bold">{r.confidence ? `${Math.round(r.confidence)}%` : "—"}</div>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="text-xs font-medium uppercase text-muted-foreground">Urgency</div>
          <div className="mt-1 text-2xl font-bold capitalize">{r.urgency ?? "routine"}</div>
        </div>
      </section>

      {r.ai_summary && (
        <section className="mt-6 rounded-2xl border bg-gradient-to-br from-primary/5 to-transparent p-6">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Sparkles className="h-3.5 w-3.5" /> AI Summary
          </div>
          <p className="text-base leading-relaxed">{r.ai_summary}</p>
        </section>
      )}

      <section className="mt-6 grid gap-6 md:grid-cols-2">
        {r.key_findings && r.key_findings.length > 0 && (
          <div className="rounded-xl border p-5">
            <h3 className="mb-3 flex items-center gap-2 font-semibold"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Key findings</h3>
            <ul className="space-y-2 text-sm">{r.key_findings.map((f, i) => <li key={i} className="flex gap-2"><span>•</span>{f}</li>)}</ul>
          </div>
        )}
        {r.probable_causes && r.probable_causes.length > 0 && (
          <div className="rounded-xl border p-5">
            <h3 className="mb-3 flex items-center gap-2 font-semibold"><AlertTriangle className="h-4 w-4 text-amber-500" /> Probable causes</h3>
            <ul className="space-y-2 text-sm">{r.probable_causes.map((f, i) => <li key={i} className="flex gap-2"><span>•</span>{f}</li>)}</ul>
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="mb-4 text-xl font-semibold">Recommended for you</h2>
        <div className="space-y-6">
          {Object.entries(grouped).map(([kind, items]) => {
            const Icon = KIND_ICON[kind] ?? Sparkles;
            return (
              <div key={kind}>
                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Icon className="h-4 w-4" /> <span className="capitalize">{kind}s</span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {items.map((rec) => (
                    <div key={rec.id} className="rounded-xl border bg-card p-4 transition hover:shadow-md">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-semibold leading-snug">{rec.title}</h4>
                        <Badge variant="secondary" className="text-xs">P{rec.priority}</Badge>
                      </div>
                      {rec.description && <p className="mt-1 text-sm text-muted-foreground">{rec.description}</p>}
                      {rec.reason && <p className="mt-2 text-xs italic text-muted-foreground">Why: {rec.reason}</p>}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-10 rounded-2xl border bg-primary text-primary-foreground p-6 sm:p-8">
        <h3 className="text-2xl font-bold">Ready to take the next step?</h3>
        <p className="mt-2 opacity-90">Book a free follow-up call with our specialist to review your plan and answer your questions.</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link to="/book"><Button variant="secondary"><Phone className="mr-2 h-4 w-4" /> Book an appointment</Button></Link>
          <Link to="/treatments"><Button variant="outline" className="bg-transparent border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/10">Explore treatments</Button></Link>
        </div>
      </section>

      <p className="mt-8 text-center text-xs text-muted-foreground">
        This report is generated by AI for informational purposes and does not replace professional medical advice.
      </p>
    </div>
  );
}

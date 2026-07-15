import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Sparkles, ArrowRight, Stethoscope, Pill, Salad, Droplet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { generateAiReport, loadAnswers } from "@/lib/dr-hair/mock";
import { CircularProgress, GlassCard, SectionHeader } from "@/components/dr-hair/ui";

export const Route = createFileRoute("/_public/dr-hair/analysis")({
  head: () => ({
    meta: [{ title: "Your AI Hair Report — Dr Hair" }],
  }),
  component: AnalysisPage,
});

function AnalysisPage() {
  const answers = useMemo(() => loadAnswers(), []);
  const report = useMemo(() => generateAiReport(answers), [answers]);
  const [reveal, setReveal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t1 = setTimeout(() => setLoading(false), 900);
    const t2 = setTimeout(() => setReveal(true), 1100);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  if (loading) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center">
        <div className="relative h-24 w-24">
          <div className="absolute inset-0 animate-ping rounded-full bg-[color:var(--dh-primary)]/20" />
          <div className="relative grid h-full w-full place-items-center rounded-full bg-[color:var(--dh-primary)] text-white">
            <Sparkles className="h-8 w-8" />
          </div>
        </div>
        <div className="mt-6 font-display text-xl font-semibold">Analyzing your hair…</div>
        <div className="mt-2 text-sm text-muted-foreground">
          Reviewing 25 signals, scalp images and lifestyle markers.
        </div>
      </div>
    );
  }

  return (
    <div className={`mx-auto max-w-6xl px-4 py-12 lg:px-6 ${reveal ? "animate-fade-in" : "opacity-0"}`}>
      <SectionHeader
        eyebrow="Your AI report"
        title={`Hi ${answers.fullName || "there"}, here's your analysis`}
        subtitle="Reviewed by dermatology-trained AI. Ready for physician approval."
      />

      {/* Scores */}
      <div className="grid gap-6 lg:grid-cols-4">
        <GlassCard className="flex flex-col items-center">
          <CircularProgress value={report.overall} label="Health Score" />
          <div className="mt-3 text-sm font-medium">Overall Hair Score</div>
        </GlassCard>
        <GlassCard className="flex flex-col items-center">
          <CircularProgress value={report.density} label="Density" />
          <div className="mt-3 text-sm font-medium">Hair Density</div>
        </GlassCard>
        <GlassCard className="flex flex-col items-center">
          <CircularProgress value={report.scalpHealth} label="Scalp" />
          <div className="mt-3 text-sm font-medium">Scalp Health</div>
        </GlassCard>
        <GlassCard>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Detected stage</div>
          <div className="mt-2 font-display text-3xl font-semibold text-[color:var(--dh-primary)]">{report.stage}</div>
          <div className="mt-3 text-sm text-muted-foreground">
            Early-to-moderate pattern hair loss. Highly reversible with a consistent, structured plan.
          </div>
          <div className="mt-4 rounded-lg bg-[color:var(--dh-primary-soft)] p-3 text-xs text-[color:var(--dh-primary)]">
            Confidence: <b>92%</b> · Model: DrHair-Vision v3.2
          </div>
        </GlassCard>
      </div>

      {/* Risk breakdown */}
      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="pt-6">
            <div className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Risk Breakdown
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={report.risks}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#0F766E" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              12-Month Predicted Improvement
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={report.timeline}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
                  <Tooltip />
                  <Line type="monotone" dataKey="score" stroke="#14B8A6" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <MiniStat label="3 Months" value={`+${report.timeline[2].score - report.overall}`} />
              <MiniStat label="6 Months" value={`+${report.timeline[3].score - report.overall}`} />
              <MiniStat label="12 Months" value={`+${report.timeline[5].score - report.overall}`} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recommendations */}
      <div className="mt-10">
        <SectionHeader
          eyebrow="Personalized recommendations"
          title="What we suggest for you"
          center={false}
        />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <RecCard icon={Salad} title="Diet">
            <ul className="space-y-1.5 text-sm">
              {report.recommendations.diet.map((d) => (
                <li key={d} className="flex gap-2">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[color:var(--dh-primary)]" />
                  {d}
                </li>
              ))}
            </ul>
          </RecCard>
          <RecCard icon={Pill} title="Medicines (Rx)">
            <ul className="space-y-1.5 text-sm">
              {report.recommendations.medicines.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          </RecCard>
          <RecCard icon={Droplet} title="Serum">
            <div className="text-sm">{report.recommendations.serum}</div>
          </RecCard>
          <RecCard icon={Sparkles} title="Supplements">
            <ul className="space-y-1.5 text-sm">
              {report.recommendations.supplements.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          </RecCard>
          <RecCard icon={Stethoscope} title="Consultation">
            <div className="text-sm">{report.recommendations.consultation}</div>
          </RecCard>
          <RecCard icon={Sparkles} title="Hair Coach">
            <div className="text-sm">{report.recommendations.coach}</div>
          </RecCard>
        </div>
      </div>

      <div className="mt-12 flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-gradient-to-br from-[color:var(--dh-primary-soft)] to-[color:var(--dh-secondary-soft)] p-6 shadow-elev-1">
        <div>
          <div className="font-display text-xl font-semibold">Your treatment kit is ready</div>
          <div className="mt-1 text-sm text-muted-foreground">
            See your personalized plan curated by our dermatology team.
          </div>
        </div>
        <Link to="/dr-hair/treatment">
          <Button size="lg" className="bg-[color:var(--dh-primary)] text-white hover:bg-[color:var(--dh-primary)]/90">
            View Treatment Plan <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/60 p-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-display text-lg font-semibold text-[color:var(--dh-primary)]">{value}</div>
    </div>
  );
}

function RecCard({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="mb-3 flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-[color:var(--dh-primary-soft)] text-[color:var(--dh-primary)]">
            <Icon className="h-4 w-4" />
          </div>
          <div className="text-sm font-semibold">{title}</div>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

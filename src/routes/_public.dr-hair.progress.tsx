import { createFileRoute } from "@tanstack/react-router";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { PROGRESS_TIMELINE } from "@/lib/dr-hair/mock";
import { GlassCard, SectionHeader } from "@/components/dr-hair/ui";
import { Sparkles, Trophy } from "lucide-react";

export const Route = createFileRoute("/_public/dr-hair/progress")({
  head: () => ({ meta: [{ title: "Progress — Dr Hair" }] }),
  component: ProgressPage,
});

function ProgressPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 lg:px-6">
      <SectionHeader
        eyebrow="Progress tracking"
        title="Your 6-month regrowth story"
        subtitle="Verified via monthly photos + adherence data. Powered by AI comparison."
      />

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardContent className="pt-6">
            <div className="mb-3 text-sm font-semibold">Hair density graph</div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={PROGRESS_TIMELINE}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="density" stroke="#0F766E" strokeWidth={3} dot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <GlassCard>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Treatment adherence</div>
          <div className="mt-2 font-display text-4xl font-semibold text-[color:var(--dh-primary)]">96%</div>
          <div className="mt-1 text-xs text-muted-foreground">Top 5% of Dr Hair patients</div>
          <div className="mt-6 space-y-3">
            <Row label="Serum" value={98} />
            <Row label="Tablets" value={94} />
            <Row label="Shampoo" value={97} />
            <Row label="Photos" value={92} />
          </div>
        </GlassCard>
      </div>

      <div className="mt-10">
        <SectionHeader eyebrow="Monthly photos" title="Your side-by-side comparison" center={false} />
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 3, 6].map((m) => (
            <div key={m} className="overflow-hidden rounded-2xl border bg-card shadow-elev-1">
              <div className="grid grid-cols-2">
                <PhotoTile label="Month 0" tint="from-slate-200 to-slate-100" />
                <PhotoTile label={`Month ${m}`} tint="from-[color:var(--dh-secondary-soft)] to-[color:var(--dh-primary-soft)]" />
              </div>
              <div className="p-4">
                <div className="text-sm font-medium">
                  Density change: <span className="text-[color:var(--dh-primary)]">+{m * 5}%</span>
                </div>
                <div className="text-xs text-muted-foreground">AI verified · Dermatologist reviewed</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-10">
        <SectionHeader eyebrow="AI insights" title="What your data is telling us" center={false} />
        <div className="grid gap-4 md:grid-cols-2">
          <Insight
            icon={Sparkles}
            title="Faster than average"
            body="You are progressing 22% faster than the median 3-month cohort. Keep protein intake consistent."
          />
          <Insight
            icon={Trophy}
            title="Milestone unlocked"
            body="Density crossed 65 — you've entered the 'visible regrowth' phase. Great work."
          />
        </div>
      </div>

      <div className="mt-10">
        <SectionHeader eyebrow="Milestones" title="Your journey markers" center={false} />
        <ol className="relative border-l pl-6">
          {PROGRESS_TIMELINE.map((t) => (
            <li key={t.month} className="mb-6">
              <div className="absolute -left-2 mt-1.5 h-3 w-3 rounded-full bg-[color:var(--dh-primary)]" />
              <div className="text-sm font-semibold">{t.month}</div>
              <div className="text-xs text-muted-foreground">
                Density {t.density} · {t.note}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted">
        <div className="h-full rounded-full bg-[color:var(--dh-primary)]" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function PhotoTile({ label, tint }: { label: string; tint: string }) {
  return (
    <div className={`relative aspect-[4/5] bg-gradient-to-br ${tint}`}>
      <div className="absolute left-2 top-2 rounded bg-white/85 px-2 py-0.5 text-[10px] font-medium">{label}</div>
    </div>
  );
}

function Insight({
  icon: Icon,
  title,
  body,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-xl border bg-gradient-to-br from-[color:var(--dh-primary-soft)] to-[color:var(--dh-secondary-soft)] p-5">
      <div className="flex items-center gap-2">
        <Icon className="h-5 w-5 text-[color:var(--dh-primary)]" />
        <div className="font-semibold">{title}</div>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { ADMIN_KPIS, FUNNEL, PLAN_PERF, REVENUE_SERIES } from "@/lib/dr-hair/mock";
import { SectionHeader } from "@/components/dr-hair/ui";
import { TrendingUp } from "lucide-react";

export const Route = createFileRoute("/_public/dr-hair/admin")({
  head: () => ({ meta: [{ title: "Executive BI — Dr Hair" }] }),
  component: AdminPage,
});

const PIE_COLORS = ["#0F766E", "#14B8A6", "#5EEAD4"];

function AdminPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 lg:px-6">
      <SectionHeader
        eyebrow="Executive dashboard"
        title="Dr Hair — Operator BI"
        subtitle="Investor-view: growth, funnel, retention and revenue at a glance."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {ADMIN_KPIS.map((k) => (
          <Card key={k.label}>
            <CardContent className="pt-5">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">{k.label}</div>
              <div className="mt-2 flex items-baseline justify-between">
                <div className="font-display text-2xl font-semibold">{k.value}</div>
                <span className="inline-flex items-center gap-1 rounded-full bg-[color:var(--dh-secondary-soft)] px-2 py-0.5 text-[11px] font-medium text-[color:var(--dh-primary)]">
                  <TrendingUp className="h-3 w-3" /> {k.delta}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="pt-6">
            <div className="mb-3 text-sm font-semibold">Revenue growth (₹ Lakh)</div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={REVENUE_SERIES}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0F766E" stopOpacity={0.55} />
                      <stop offset="100%" stopColor="#0F766E" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="m" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="rev" stroke="#0F766E" strokeWidth={2} fill="url(#revGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="mb-3 text-sm font-semibold">Subscriber growth</div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={REVENUE_SERIES}>
                  <defs>
                    <linearGradient id="subGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#14B8A6" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="#14B8A6" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="m" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="subs" stroke="#14B8A6" strokeWidth={2} fill="url(#subGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="pt-6">
            <div className="mb-3 text-sm font-semibold">Funnel — landing to subscribe</div>
            <ul className="space-y-3">
              {FUNNEL.map((s, i) => {
                const pct = (s.value / FUNNEL[0].value) * 100;
                return (
                  <li key={s.stage}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span>{s.stage}</span>
                      <span className="text-muted-foreground">
                        {s.value.toLocaleString()} · {pct.toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${pct}%`,
                          background: `linear-gradient(90deg, #0F766E, #14B8A6 ${i * 20}%)`,
                        }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="mb-3 text-sm font-semibold">Top performing plans</div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={PLAN_PERF}
                    dataKey="subs"
                    nameKey="plan"
                    innerRadius={45}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {PLAN_PERF.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <SectionHeader eyebrow="Journey" title="Patient journey mix" center={false} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { l: "New patients (30d)", v: "3,214" },
            { l: "Active plans", v: "6,411" },
            { l: "Refills (30d)", v: "4,908" },
            { l: "NPS", v: "72" },
          ].map((s) => (
            <Card key={s.l}>
              <CardContent className="pt-5">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">{s.l}</div>
                <div className="mt-2 font-display text-2xl font-semibold text-[color:var(--dh-primary)]">{s.v}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

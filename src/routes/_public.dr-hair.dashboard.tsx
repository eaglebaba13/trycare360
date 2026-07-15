import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Bell,
  Calendar,
  Camera,
  MessageCircle,
  Package,
  ShoppingBag,
  Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CircularProgress, GlassCard, SectionHeader } from "@/components/dr-hair/ui";
import { ACHIEVEMENTS, MESSAGES, PROGRESS_TIMELINE, REMINDERS } from "@/lib/dr-hair/mock";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export const Route = createFileRoute("/_public/dr-hair/dashboard")({
  head: () => ({ meta: [{ title: "My Dashboard — Dr Hair" }] }),
  component: DashboardPage,
});

function DashboardPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 lg:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Welcome back</div>
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">Rahul's Hair Journey</h1>
        </div>
        <div className="flex gap-2">
          <Link to="/dr-hair/coach">
            <Button variant="outline">
              <MessageCircle className="mr-1 h-4 w-4" /> Chat with Coach
            </Button>
          </Link>
          <Link to="/dr-hair/progress">
            <Button className="bg-[color:var(--dh-primary)] text-white hover:bg-[color:var(--dh-primary)]/90">
              <Camera className="mr-1 h-4 w-4" /> Upload Progress
            </Button>
          </Link>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-4">
        <GlassCard className="lg:col-span-1 flex flex-col items-center">
          <CircularProgress value={74} label="Health Score" />
          <div className="mt-3 text-sm font-medium">Hair Health Score</div>
          <div className="mt-1 text-xs text-muted-foreground">+8 from last month</div>
        </GlassCard>

        <Card className="lg:col-span-2">
          <CardContent className="pt-6">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-semibold">Density trend</div>
              <span className="text-xs text-muted-foreground">Last 6 months</span>
            </div>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={PROGRESS_TIMELINE}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="density" fill="#14B8A6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardContent className="pt-6">
            <div className="text-sm font-semibold">Subscription</div>
            <div className="mt-2 font-display text-2xl font-semibold text-[color:var(--dh-primary)]">3-Month Plan</div>
            <div className="mt-1 text-xs text-muted-foreground">Next refill: 12 Jul 2026</div>
            <div className="mt-4 h-1.5 rounded-full bg-muted">
              <div className="h-full w-2/3 rounded-full bg-[color:var(--dh-primary)]" />
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground">Month 2 of 3 in progress</div>
            <div className="mt-4 flex gap-2">
              <Button size="sm" variant="outline" className="flex-1">
                <Package className="mr-1 h-3.5 w-3.5" /> Manage
              </Button>
              <Button size="sm" variant="outline" className="flex-1">
                <ShoppingBag className="mr-1 h-3.5 w-3.5" /> Reorder
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-semibold">Today's Routine</div>
              <Bell className="h-4 w-4 text-muted-foreground" />
            </div>
            <ul className="space-y-2">
              {REMINDERS.map((r) => (
                <li key={r.time} className="flex items-center justify-between rounded-lg border p-2.5 text-sm">
                  <div>
                    <div className="font-medium">{r.label}</div>
                    <div className="text-[11px] text-muted-foreground">{r.time}</div>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      r.status === "done"
                        ? "bg-[color:var(--dh-secondary-soft)] text-[color:var(--dh-primary)]"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {r.status === "done" ? "Done" : "Pending"}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="mb-3 text-sm font-semibold">Upcoming Consultation</div>
            <div className="rounded-lg border bg-[color:var(--dh-primary-soft)] p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[color:var(--dh-primary)] to-[color:var(--dh-secondary)]" />
                <div>
                  <div className="text-sm font-semibold">Dr. Aditi Sharma</div>
                  <div className="text-xs text-muted-foreground">Fri, 18 Jul · 6:00 PM</div>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <Button size="sm" className="flex-1 bg-[color:var(--dh-primary)] text-white hover:bg-[color:var(--dh-primary)]/90">
                  <Calendar className="mr-1 h-3.5 w-3.5" /> Join call
                </Button>
                <Button size="sm" variant="outline" className="flex-1">Reschedule</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="mb-3 text-sm font-semibold">Coach Messages</div>
            <ul className="space-y-3">
              {MESSAGES.map((m) => (
                <li key={m.body} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-semibold">{m.from}</div>
                    <span className="text-[10px] text-muted-foreground">{m.ts}</span>
                  </div>
                  <p className="mt-1 text-sm">{m.body}</p>
                </li>
              ))}
            </ul>
            <Link to="/dr-hair/coach">
              <Button variant="ghost" size="sm" className="mt-2 w-full">
                Open chat <MessageCircle className="ml-1 h-3.5 w-3.5" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <SectionHeader eyebrow="Milestones" title="Your achievements" center={false} />
        <div className="grid gap-4 sm:grid-cols-3">
          {ACHIEVEMENTS.map((a) => (
            <GlassCard key={a.title}>
              <Trophy className="h-6 w-6 text-[color:var(--dh-warning)]" />
              <div className="mt-3 font-semibold">{a.title}</div>
              <div className="mt-1 text-xs text-muted-foreground">{a.desc}</div>
            </GlassCard>
          ))}
        </div>
      </div>
    </div>
  );
}

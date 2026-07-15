import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ShieldCheck,
  Sparkles,
  UserCheck,
  Truck,
  ChevronDown,
  Star,
  ArrowRight,
  Activity,
  Brain,
  HeartPulse,
  Moon,
  Droplets,
  Salad,
  Dna,
  Bug,
} from "lucide-react";
import {
  DrHairBadge,
  DrHairCTA,
  GlassCard,
  SectionHeader,
  StatBlock,
  StickyCTA,
} from "@/components/dr-hair/ui";
import { STATS, CAUSES, DOCTORS, COACHES, TESTIMONIALS, FAQS, PLANS } from "@/lib/dr-hair/mock";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export const Route = createFileRoute("/_public/dr-hair/")({
  head: () => ({
    meta: [
      { title: "Dr Hair — AI Hair Analysis & Personalized Treatment | TryCare360" },
      {
        name: "description",
        content:
          "Dermatologist-led, AI-powered hair analysis and personalized treatment plans delivered to your door. 92% success rate across 48,200+ patients.",
      },
      { property: "og:title", content: "Dr Hair — AI Hair Analysis by TryCare360" },
      { property: "og:description", content: "AI-powered hair analysis with dermatologist-led treatment plans." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DrHairLanding,
});

const CAUSE_ICONS = [Dna, Brain, Salad, Activity, HeartPulse, Activity, Bug, Moon];

function DrHairLanding() {
  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 -z-10 opacity-70"
          style={{
            background:
              "radial-gradient(1000px 500px at 15% -10%, rgba(20,184,166,0.18), transparent 60%)," +
              "radial-gradient(800px 400px at 85% 10%, rgba(15,118,110,0.14), transparent 60%)",
          }}
        />
        <div className="mx-auto grid max-w-6xl gap-10 px-4 pb-16 pt-14 lg:grid-cols-2 lg:px-6 lg:pt-20">
          <div>
            <DrHairBadge>Powered by clinical AI</DrHairBadge>
            <h1 className="mt-4 font-display text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              Hair Fall Starts <span className="text-[color:var(--dh-primary)]">From Within.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted-foreground">
              AI-powered hair analysis combined with dermatologist expertise and personalized treatment plans —
              delivered to your door and coached to results.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <DrHairCTA to="/dr-hair/assessment" label="Start Free Hair Test" />
              <DrHairCTA to="/dr-hair/progress" label="View Success Stories" variant="outline" />
            </div>

            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <TrustPill icon={ShieldCheck} label="Dermatologist Approved" />
              <TrustPill icon={Sparkles} label="AI Analysis" />
              <TrustPill icon={UserCheck} label="Personalized" />
              <TrustPill icon={Truck} label="Home Delivery" />
            </div>
          </div>

          {/* Hero visual */}
          <div className="relative">
            <div className="relative mx-auto aspect-[4/5] w-full max-w-md overflow-hidden rounded-3xl border bg-gradient-to-br from-[color:var(--dh-secondary-soft)] to-[color:var(--dh-primary-soft)] p-6 shadow-elev-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold uppercase tracking-wider text-[color:var(--dh-primary)]">
                  Hair Health Score
                </div>
                <div className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-medium text-[color:var(--dh-primary)]">
                  Live
                </div>
              </div>
              <div className="mt-6 flex items-center gap-6">
                <ScoreRing value={82} />
                <div className="space-y-1.5">
                  <MiniBar label="Density" value={78} />
                  <MiniBar label="Scalp" value={86} />
                  <MiniBar label="Nutrition" value={64} />
                  <MiniBar label="Stress" value={72} />
                </div>
              </div>
              <div className="mt-6 rounded-xl bg-white/80 p-4 text-sm shadow-elev-1">
                <div className="font-medium">Stage: Norwood II</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Predicted +22% density in 6 months with your personalized plan.
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="aspect-square rounded-lg bg-white/70 p-2 text-[10px] text-muted-foreground shadow-inner">
                    <div className="h-full w-full rounded-md bg-gradient-to-br from-[color:var(--dh-primary)]/25 to-[color:var(--dh-secondary)]/20" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="mx-auto max-w-6xl px-4 pb-16 lg:px-6">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {STATS.map((s) => (
            <StatBlock key={s.label} value={s.value} label={s.label} />
          ))}
        </div>
      </section>

      {/* BEFORE & AFTER */}
      <section className="mx-auto max-w-6xl px-4 pb-20 lg:px-6">
        <SectionHeader
          eyebrow="Real results"
          title="Before & After"
          subtitle="Verified patient outcomes across 6 months of Dr Hair treatment. Photos anonymized for the demo."
        />
        <div className="grid gap-6 md:grid-cols-3">
          {[3, 6, 9].map((m) => (
            <div key={m} className="overflow-hidden rounded-2xl border bg-card shadow-elev-1">
              <div className="grid grid-cols-2">
                <BAImg label="Before" tint="from-slate-200 to-slate-100" />
                <BAImg label={`Month ${m}`} tint="from-[color:var(--dh-secondary-soft)] to-[color:var(--dh-primary-soft)]" />
              </div>
              <div className="p-4">
                <div className="text-sm font-medium">Density +{Math.round(m * 4.5)}%</div>
                <div className="text-xs text-muted-foreground">Verified by dermatologist review</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CAUSES */}
      <section className="border-y bg-muted/40">
        <div className="mx-auto max-w-6xl px-4 py-16 lg:px-6">
          <SectionHeader
            eyebrow="Root causes"
            title="Why does hair fall really happen?"
            subtitle="Dr Hair looks at 8 root cause vectors, not just symptoms."
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {CAUSES.map((c, i) => {
              const Icon = CAUSE_ICONS[i % CAUSE_ICONS.length];
              return (
                <GlassCard key={c.title} className="text-left">
                  <Icon className="h-6 w-6 text-[color:var(--dh-primary)]" />
                  <div className="mt-3 font-medium">{c.title}</div>
                  <div className="mt-1 text-sm text-muted-foreground">{c.desc}</div>
                </GlassCard>
              );
            })}
          </div>
        </div>
      </section>

      {/* JOURNEY */}
      <section className="mx-auto max-w-6xl px-4 py-20 lg:px-6">
        <SectionHeader
          eyebrow="Your journey"
          title="From assessment to full regrowth"
          subtitle="A 6-step, science-backed journey — coached end to end."
        />
        <ol className="relative grid gap-6 md:grid-cols-3 lg:grid-cols-6">
          {[
            "Take the AI Hair Test",
            "Upload Photos",
            "Get Instant AI Report",
            "Dermatologist Reviews",
            "Personalized Kit Delivered",
            "Track Monthly Progress",
          ].map((step, i) => (
            <li key={step} className="relative">
              <div className="rounded-xl border bg-card p-4 shadow-elev-1">
                <div className="grid h-8 w-8 place-items-center rounded-full bg-[color:var(--dh-primary)] text-xs font-semibold text-white">
                  {i + 1}
                </div>
                <div className="mt-3 text-sm font-medium">{step}</div>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* DOCTORS */}
      <section className="border-t bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 py-20 lg:px-6">
          <SectionHeader
            eyebrow="Meet the team"
            title="Board-certified dermatologists"
            subtitle="Every plan is reviewed and prescribed by a licensed dermatologist."
          />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {DOCTORS.map((d) => (
              <GlassCard key={d.name}>
                <div className="h-16 w-16 rounded-full bg-gradient-to-br from-[color:var(--dh-primary)] to-[color:var(--dh-secondary)] shadow-elev-1" />
                <div className="mt-4 font-medium">{d.name}</div>
                <div className="text-xs text-muted-foreground">{d.title}</div>
                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="rounded-full bg-[color:var(--dh-primary-soft)] px-2 py-0.5 text-[color:var(--dh-primary)]">
                    {d.tag}
                  </span>
                  <span className="text-muted-foreground">{d.experience}</span>
                </div>
              </GlassCard>
            ))}
          </div>

          <div className="mt-16">
            <SectionHeader eyebrow="Coaches" title="Your personal hair coaches" />
            <div className="grid gap-5 sm:grid-cols-3">
              {COACHES.map((c) => (
                <GlassCard key={c.name}>
                  <div className="h-14 w-14 rounded-full bg-gradient-to-br from-[color:var(--dh-secondary)] to-[color:var(--dh-primary)]" />
                  <div className="mt-4 font-medium">{c.name}</div>
                  <div className="text-xs text-muted-foreground">{c.tag}</div>
                  <div className="mt-2 text-xs text-muted-foreground">{c.experience} experience</div>
                </GlassCard>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="mx-auto max-w-6xl px-4 py-20 lg:px-6">
        <SectionHeader eyebrow="Loved by patients" title="Real stories, real regrowth" />
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {TESTIMONIALS.map((t) => (
            <Card key={t.name}>
              <CardContent className="pt-6">
                <div className="flex gap-0.5 text-[color:var(--dh-warning)]">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <p className="mt-3 text-sm">“{t.quote}”</p>
                <div className="mt-4 text-xs text-muted-foreground">
                  {t.name} · {t.city} · Month {t.months}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* PLANS TEASER */}
      <section className="border-t bg-muted/40">
        <div className="mx-auto max-w-6xl px-4 py-20 lg:px-6">
          <SectionHeader
            eyebrow="Simple pricing"
            title="Subscribe & save"
            subtitle="Cancel anytime. Every plan includes dermatologist review, AI analysis and home delivery."
          />
          <div className="grid gap-6 md:grid-cols-3">
            {PLANS.map((p) => (
              <div
                key={p.id}
                className={`relative rounded-2xl border bg-card p-6 shadow-elev-1 ${
                  p.popular ? "border-[color:var(--dh-primary)] ring-2 ring-[color:var(--dh-primary)]/20" : ""
                }`}
              >
                {p.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[color:var(--dh-primary)] px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-white">
                    Most Popular
                  </div>
                )}
                <div className="text-sm font-medium">{p.name}</div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="font-display text-4xl font-semibold">₹{p.price.toLocaleString()}</span>
                  <span className="text-xs text-muted-foreground line-through">₹{p.original.toLocaleString()}</span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">₹{p.perMonth.toLocaleString()}/mo</div>
                {p.savings && (
                  <div className="mt-3 inline-block rounded-full bg-[color:var(--dh-secondary-soft)] px-2 py-0.5 text-xs text-[color:var(--dh-primary)]">
                    {p.savings}
                  </div>
                )}
                <ul className="mt-6 space-y-2 text-sm">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[color:var(--dh-primary)]" />
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="mt-6">
                  <Link to="/dr-hair/pricing" className="block">
                    <Button className="w-full bg-[color:var(--dh-primary)] text-white hover:bg-[color:var(--dh-primary)]/90">
                      Choose plan <ArrowRight className="ml-1 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 py-20 lg:px-6">
        <SectionHeader eyebrow="FAQ" title="Everything you might ask" />
        <div className="space-y-3">
          {FAQS.map((f) => (
            <Faq key={f.q} q={f.q} a={f.a} />
          ))}
        </div>
      </section>

      <StickyCTA />
    </div>
  );
}

function TrustPill({ icon: Icon, label }: { icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-xs text-muted-foreground shadow-elev-1">
      <Icon className="h-4 w-4 text-[color:var(--dh-primary)]" />
      <span className="truncate">{label}</span>
    </div>
  );
}

function ScoreRing({ value }: { value: number }) {
  const size = 120;
  const stroke = 12;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(15,118,110,0.15)" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="var(--dh-primary)"
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute grid place-items-center text-center">
        <div className="font-display text-3xl font-semibold text-[color:var(--dh-primary)]">{value}</div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">of 100</div>
      </div>
    </div>
  );
}

function MiniBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="w-40">
      <div className="mb-1 flex items-center justify-between text-[11px]">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value}</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/60">
        <div
          className="h-full rounded-full bg-[color:var(--dh-primary)] transition-all"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function BAImg({ label, tint }: { label: string; tint: string }) {
  return (
    <div className={`relative aspect-[4/5] bg-gradient-to-br ${tint}`}>
      <div className="absolute left-2 top-2 rounded bg-white/80 px-2 py-0.5 text-[10px] font-medium">{label}</div>
    </div>
  );
}

function Faq({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border bg-card">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="text-sm font-medium">{q}</span>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="border-t px-5 py-4 text-sm text-muted-foreground">{a}</div>}
    </div>
  );
}

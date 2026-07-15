import { createFileRoute, Link } from "@tanstack/react-router";
import { Sun, Sunrise, Moon, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ROUTINE, TREATMENT_KIT } from "@/lib/dr-hair/mock";
import { GlassCard, SectionHeader } from "@/components/dr-hair/ui";

export const Route = createFileRoute("/_public/dr-hair/treatment")({
  head: () => ({ meta: [{ title: "Your Personalized Treatment — Dr Hair" }] }),
  component: TreatmentPage,
});

function TreatmentPage() {
  const total = TREATMENT_KIT.reduce((s, i) => s + i.price, 0);
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 lg:px-6">
      <SectionHeader
        eyebrow="Curated by our dermatologists"
        title="Your Personalized Hair Growth Kit"
        subtitle="A complete 4-part system: prescription, care, nutrition and coaching."
      />

      <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
        <div>
          <div className="grid gap-4 sm:grid-cols-2">
            {TREATMENT_KIT.map((item, i) => (
              <GlassCard key={item.name}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold">{item.name}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{item.desc}</div>
                  </div>
                  <div
                    className="grid h-14 w-14 shrink-0 place-items-center rounded-lg text-white shadow-elev-1"
                    style={{
                      background: `linear-gradient(135deg, hsla(${170 + i * 8}, 60%, 40%, 1), hsla(${180 + i * 10}, 55%, 50%, 1))`,
                    }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {item.price === 0 ? "Included in plan" : `₹${item.price}`}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-[color:var(--dh-primary-soft)] px-2 py-0.5 text-[10px] font-medium text-[color:var(--dh-primary)]">
                    <Check className="h-3 w-3" /> In your kit
                  </span>
                </div>
              </GlassCard>
            ))}
          </div>

          <div className="mt-10">
            <SectionHeader eyebrow="Daily routine" title="Your daily hair care ritual" center={false} />
            <div className="grid gap-4 md:grid-cols-3">
              <RoutineCard icon={Sunrise} title="Morning" items={ROUTINE.morning} />
              <RoutineCard icon={Sun} title="Afternoon" items={ROUTINE.afternoon} />
              <RoutineCard icon={Moon} title="Night" items={ROUTINE.night} />
            </div>
          </div>

          <div className="mt-10">
            <SectionHeader eyebrow="Expected outcome" title="Your first 6 months" center={false} />
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { m: "Month 1", desc: "Reduced shedding, healthier scalp" },
                { m: "Month 3", desc: "New vellus hair, hairline density lift" },
                { m: "Month 6", desc: "Visible regrowth & +22% density" },
              ].map((s) => (
                <Card key={s.m}>
                  <CardContent className="pt-6">
                    <div className="text-xs font-semibold uppercase tracking-wider text-[color:var(--dh-primary)]">
                      {s.m}
                    </div>
                    <div className="mt-2 text-sm">{s.desc}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* Sticky order card */}
        <div>
          <div className="sticky top-32 rounded-2xl border bg-card p-6 shadow-elev-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Your kit</div>
            <div className="mt-1 font-display text-2xl font-semibold">Personalized Hair Growth Kit</div>
            <div className="mt-4 space-y-2 border-y py-4 text-sm">
              {TREATMENT_KIT.map((i) => (
                <div key={i.name} className="flex justify-between text-muted-foreground">
                  <span>{i.name}</span>
                  <span>{i.price === 0 ? "Included" : `₹${i.price}`}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Kit total (before plan discount)</span>
              <span className="font-display text-2xl font-semibold">₹{total.toLocaleString()}</span>
            </div>
            <Link to="/dr-hair/pricing" className="mt-6 block">
              <Button
                size="lg"
                className="w-full bg-[color:var(--dh-primary)] text-white hover:bg-[color:var(--dh-primary)]/90"
              >
                Start My Treatment <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
            <div className="mt-3 text-center text-xs text-muted-foreground">
              Cancel anytime · Dermatologist Rx required · Free delivery
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RoutineCard({
  icon: Icon,
  title,
  items,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  items: string[];
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
        <ul className="space-y-2 text-sm">
          {items.map((i) => (
            <li key={i} className="flex items-start gap-2">
              <Check className="mt-0.5 h-3.5 w-3.5 text-[color:var(--dh-primary)]" />
              {i}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Check, Shield, Truck, HeartHandshake } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/dr-hair/ui";
import { PLANS, saveSubscription } from "@/lib/dr-hair/mock";

export const Route = createFileRoute("/_public/dr-hair/pricing")({
  head: () => ({ meta: [{ title: "Plans & Pricing — Dr Hair" }] }),
  component: PricingPage,
});

function PricingPage() {
  const navigate = useNavigate();
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 lg:px-6">
      <SectionHeader
        eyebrow="Simple, transparent pricing"
        title="Pick the plan that fits your goals"
        subtitle="Every plan includes dermatologist care, AI analysis and home delivery. Cancel anytime."
      />

      <div className="grid gap-6 md:grid-cols-3">
        {PLANS.map((p) => (
          <div
            key={p.id}
            className={`relative flex flex-col rounded-2xl border bg-card p-6 shadow-elev-1 ${
              p.popular ? "border-[color:var(--dh-primary)] ring-2 ring-[color:var(--dh-primary)]/20 scale-[1.02]" : ""
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
            <div className="mt-1 text-xs text-muted-foreground">₹{p.perMonth.toLocaleString()}/month</div>
            {p.savings && (
              <div className="mt-3 inline-block w-max rounded-full bg-[color:var(--dh-secondary-soft)] px-2 py-0.5 text-xs text-[color:var(--dh-primary)]">
                {p.savings}
              </div>
            )}
            <ul className="mt-6 flex-1 space-y-2 text-sm">
              {p.features.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 text-[color:var(--dh-primary)]" />
                  {f}
                </li>
              ))}
            </ul>
            <Button
              onClick={() => {
                saveSubscription(p.id);
                navigate({ to: "/dr-hair/checkout-success" });
              }}
              className="mt-6 w-full bg-[color:var(--dh-primary)] text-white hover:bg-[color:var(--dh-primary)]/90"
              size="lg"
            >
              Choose {p.name}
            </Button>
          </div>
        ))}
      </div>

      <div className="mt-14 grid gap-4 sm:grid-cols-3">
        <Feature icon={Shield} title="Dermatologist-led" desc="Rx reviewed by licensed doctors." />
        <Feature icon={Truck} title="Free home delivery" desc="Monthly refills, doorstep-delivered." />
        <Feature icon={HeartHandshake} title="Cancel anytime" desc="No lock-in. Pause when you like." />
      </div>
    </div>
  );
}

function Feature({
  icon: Icon,
  title,
  desc,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border bg-card p-4 shadow-elev-1">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[color:var(--dh-primary-soft)] text-[color:var(--dh-primary)]">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="text-sm font-medium">{title}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
    </div>
  );
}

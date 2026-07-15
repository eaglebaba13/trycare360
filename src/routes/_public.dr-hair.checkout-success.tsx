import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, ArrowRight, Package, Calendar, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/dr-hair/ui";

export const Route = createFileRoute("/_public/dr-hair/checkout-success")({
  head: () => ({ meta: [{ title: "You're in — Dr Hair" }] }),
  component: SuccessPage,
});

function SuccessPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 text-center lg:px-6">
      <div className="mx-auto mb-6 grid h-20 w-20 place-items-center rounded-full bg-[color:var(--dh-primary)] text-white shadow-elev-3 animate-scale-in">
        <CheckCircle2 className="h-10 w-10" />
      </div>
      <h1 className="font-display text-4xl font-semibold tracking-tight">Welcome to Dr Hair 🎉</h1>
      <p className="mt-3 text-muted-foreground">
        Your personalized kit is being prepared. A dermatologist will review your plan and reach out within 24 hours.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-3 text-left">
        <GlassCard>
          <Package className="h-6 w-6 text-[color:var(--dh-primary)]" />
          <div className="mt-2 text-sm font-semibold">Kit dispatched</div>
          <div className="mt-1 text-xs text-muted-foreground">Doorstep delivery in 2–4 days.</div>
        </GlassCard>
        <GlassCard>
          <Calendar className="h-6 w-6 text-[color:var(--dh-primary)]" />
          <div className="mt-2 text-sm font-semibold">Consult scheduled</div>
          <div className="mt-1 text-xs text-muted-foreground">Video call within 24 hours.</div>
        </GlassCard>
        <GlassCard>
          <MessageCircle className="h-6 w-6 text-[color:var(--dh-primary)]" />
          <div className="mt-2 text-sm font-semibold">Coach assigned</div>
          <div className="mt-1 text-xs text-muted-foreground">Say hi in the coach chat.</div>
        </GlassCard>
      </div>

      <div className="mt-10">
        <Link to="/dr-hair/dashboard">
          <Button
            size="lg"
            className="bg-[color:var(--dh-primary)] text-white hover:bg-[color:var(--dh-primary)]/90"
          >
            Go to my dashboard <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
}

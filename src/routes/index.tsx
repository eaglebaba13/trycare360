import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Stethoscope, ShieldCheck, Building2, Sparkles } from "lucide-react";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/60 backdrop-blur sticky top-0 z-20">
        <div className="max-w-6xl mx-auto flex items-center justify-between h-16 px-4 lg:px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-primary text-primary-foreground grid place-items-center shadow-elev-1">
              <Stethoscope className="h-5 w-5" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="font-display text-base font-semibold tracking-tight">
                TryCare<span className="text-[color:var(--gold)]">360</span>
              </span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                Healthcare Network
              </span>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/auth">
              <Button variant="ghost" size="sm">
                Sign in
              </Button>
            </Link>
            <Link to="/auth">
              <Button size="sm">Get started</Button>
            </Link>
          </div>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-4 lg:px-6 pt-20 pb-24">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent text-accent-foreground text-xs font-medium">
            <Sparkles className="h-3.5 w-3.5" />
            Enterprise Healthcare Ecosystem
          </div>
          <h1 className="mt-6 font-display text-4xl lg:text-6xl font-semibold tracking-tight leading-tight">
            India's complete Hair, Skin, Nail & Nutrition healthcare network.
          </h1>
          <p className="mt-6 text-lg text-muted-foreground leading-relaxed max-w-2xl">
            One multi-tenant platform for CRM, clinical, franchise ERP, finance,
            AI assessments and marketing — built for 1,000+ franchises and a
            million customers from day one.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/auth">
              <Button size="lg">Sign in to your dashboard</Button>
            </Link>
          </div>
        </div>

        <div className="mt-20 grid gap-6 md:grid-cols-3">
          <FeatureCard
            icon={Building2}
            title="Multi-tenant franchise"
            body="Corporate → State Master → City Franchise → Centers → Departments. Every row scoped, every report rolled up."
          />
          <FeatureCard
            icon={ShieldCheck}
            title="Enterprise RBAC"
            body="21 roles, permission catalog, row-level security and full audit trail across every module."
          />
          <FeatureCard
            icon={Sparkles}
            title="AI-native"
            body="Hair, skin, nail and nutrition assessments with treatment recommendations and progress comparison."
          />
        </div>
      </section>

      <footer className="border-t py-8">
        <div className="max-w-6xl mx-auto px-4 lg:px-6 text-xs text-muted-foreground">
          © {new Date().getFullYear()} TryCare360. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  body,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-6 shadow-elev-1">
      <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary grid place-items-center">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-4 font-display text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{body}</p>
    </div>
  );
}

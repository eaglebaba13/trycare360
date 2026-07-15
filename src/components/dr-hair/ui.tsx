import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Brand palette overrides (teal per Dr Hair spec) scoped to this section. */
export function DrHairThemeScope({ children }: { children: ReactNode }) {
  return (
    <div
      className="dr-hair-scope"
      style={
        {
          // brand tokens as CSS vars — used by classes below
          ["--dh-primary" as string]: "#0F766E",
          ["--dh-secondary" as string]: "#14B8A6",
          ["--dh-success" as string]: "#22C55E",
          ["--dh-warning" as string]: "#F59E0B",
          ["--dh-danger" as string]: "#EF4444",
          ["--dh-primary-soft" as string]: "rgba(15,118,110,0.08)",
          ["--dh-secondary-soft" as string]: "rgba(20,184,166,0.10)",
        } as React.CSSProperties
      }
    >
      {children}
    </div>
  );
}

export function DrHairBadge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--dh-primary)]/20 bg-[color:var(--dh-primary-soft)] px-3 py-1 text-xs font-medium text-[color:var(--dh-primary)]">
      <Sparkles className="h-3 w-3" />
      {children}
    </span>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  subtitle,
  center = true,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  center?: boolean;
}) {
  return (
    <div className={cn("mb-10", center && "mx-auto max-w-2xl text-center")}>
      {eyebrow && (
        <div className="mb-3">
          <DrHairBadge>{eyebrow}</DrHairBadge>
        </div>
      )}
      <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h2>
      {subtitle && <p className="mt-3 text-base text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

export function DrHairCTA({ to, label, variant = "primary" }: { to: string; label: string; variant?: "primary" | "outline" }) {
  return (
    <Link to={to}>
      <Button
        size="lg"
        variant={variant === "outline" ? "outline" : "default"}
        className={cn(
          "gap-2",
          variant === "primary" &&
            "bg-[color:var(--dh-primary)] text-white shadow-lg hover:bg-[color:var(--dh-primary)]/90",
          variant === "outline" &&
            "border-[color:var(--dh-primary)]/30 text-[color:var(--dh-primary)] hover:bg-[color:var(--dh-primary-soft)]",
        )}
      >
        {label}
        <ArrowRight className="h-4 w-4" />
      </Button>
    </Link>
  );
}

export function DrHairSubNav() {
  const links = [
    { to: "/dr-hair", label: "Overview" },
    { to: "/dr-hair/assessment", label: "Hair Test" },
    { to: "/dr-hair/analysis", label: "AI Report" },
    { to: "/dr-hair/treatment", label: "Treatment" },
    { to: "/dr-hair/pricing", label: "Plans" },
    { to: "/dr-hair/dashboard", label: "Dashboard" },
    { to: "/dr-hair/progress", label: "Progress" },
    { to: "/dr-hair/coach", label: "Coach" },
    { to: "/dr-hair/admin", label: "Admin BI" },
  ];
  return (
    <div className="sticky top-16 z-30 border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-1 overflow-x-auto px-4 py-2 lg:px-6">
        <span className="mr-3 shrink-0 rounded-md bg-[color:var(--dh-primary)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white">
          Dr Hair
        </span>
        {links.map((l) => (
          <Link
            key={l.to}
            to={l.to}
            className="shrink-0 rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
            activeOptions={{ exact: l.to === "/dr-hair" }}
            activeProps={{ className: "bg-[color:var(--dh-primary-soft)] text-[color:var(--dh-primary)] font-medium" }}
          >
            {l.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

export function GlassCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "rounded-2xl border bg-card/60 p-6 shadow-elev-1 backdrop-blur transition-shadow hover:shadow-elev-2",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function StatBlock({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl border bg-card p-6 text-center shadow-elev-1">
      <div className="font-display text-3xl font-semibold text-[color:var(--dh-primary)] sm:text-4xl">{value}</div>
      <div className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}

export function CircularProgress({ value, size = 140, label }: { value: number; size?: number; label?: string }) {
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(15,118,110,0.12)" strokeWidth={stroke} fill="none" />
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
          className="transition-all duration-1000"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="font-display text-3xl font-semibold text-[color:var(--dh-primary)]">{value}</div>
          {label && <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>}
        </div>
      </div>
    </div>
  );
}

export function StickyCTA() {
  return (
    <div className="fixed bottom-4 left-1/2 z-40 -translate-x-1/2 rounded-full border bg-background/95 px-2 py-1.5 shadow-elev-3 backdrop-blur">
      <div className="flex items-center gap-2">
        <span className="hidden pl-3 text-sm font-medium sm:inline">Ready to take control of your hair?</span>
        <DrHairCTA to="/dr-hair/assessment" label="Start Free Test" />
      </div>
    </div>
  );
}

import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface KpiCardProps {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  tone?: "default" | "success" | "warning" | "danger" | "info";
  onClick?: () => void;
}

const TONE: Record<NonNullable<KpiCardProps["tone"]>, string> = {
  default: "text-foreground",
  success: "text-emerald-600 dark:text-emerald-400",
  warning: "text-amber-600 dark:text-amber-400",
  danger: "text-rose-600 dark:text-rose-400",
  info: "text-sky-600 dark:text-sky-400",
};

export function KpiCard({ label, value, hint, icon: Icon, tone = "default", onClick }: KpiCardProps) {
  return (
    <Card
      onClick={onClick}
      className={cn(
        "transition-colors",
        onClick && "cursor-pointer hover:bg-muted/40",
      )}
    >
      <CardContent className="pt-6">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-wider text-muted-foreground truncate">
              {label}
            </div>
            <div className={cn("mt-2 font-display text-3xl font-semibold tabular-nums", TONE[tone])}>
              {value}
            </div>
            {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
          </div>
          {Icon && <Icon className={cn("h-5 w-5 shrink-0 opacity-60", TONE[tone])} />}
        </div>
      </CardContent>
    </Card>
  );
}

export function KpiGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">{children}</div>;
}

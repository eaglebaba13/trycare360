/**
 * Reusable 360 Context Panel
 * ------------------------------------------------------------------
 * Right-side collapsible summary rail used across every 360 workspace
 * (Lead, Patient, Doctor, Vendor, Franchise). Section-driven so each
 * module composes only the panes it needs without forking the shell.
 */
import { useState, type ReactNode } from "react";
import { ChevronsLeft, ChevronsRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface Context360Section {
  id: string;
  label: string;
  icon?: ReactNode;
  content: ReactNode;
}

export function Context360Panel({
  sections,
  title = "360° Context",
  defaultCollapsed = false,
  className,
}: {
  sections: Context360Section[];
  title?: string;
  defaultCollapsed?: boolean;
  className?: string;
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  if (collapsed) {
    return (
      <aside className={cn("shrink-0", className)}>
        <Button variant="outline" size="icon" onClick={() => setCollapsed(false)} aria-label="Expand context panel">
          <ChevronsLeft className="h-4 w-4" />
        </Button>
      </aside>
    );
  }

  return (
    <aside className={cn("min-w-0 space-y-3", className)}>
      <div className="flex items-center justify-between px-1">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</div>
        <Button variant="ghost" size="icon" onClick={() => setCollapsed(true)} aria-label="Collapse context panel">
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
      {sections.map((s) => (
        <Card key={s.id}>
          <CardContent className="pt-4 pb-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {s.icon}
              <span>{s.label}</span>
            </div>
            <div className="text-sm">{s.content}</div>
          </CardContent>
        </Card>
      ))}
    </aside>
  );
}

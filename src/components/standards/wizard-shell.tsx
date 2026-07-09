import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface WizardStep {
  id: string;
  label: string;
  description?: string;
}

export interface WizardShellProps {
  steps: WizardStep[];
  currentIndex: number;
  onStep: (index: number) => void;
  onBack?: () => void;
  onNext?: () => void;
  onFinish?: () => void;
  canProceed?: boolean;
  isSubmitting?: boolean;
  finishLabel?: string;
  children: ReactNode;
  sidebar?: ReactNode;
}

export function WizardShell({
  steps,
  currentIndex,
  onStep,
  onBack,
  onNext,
  onFinish,
  canProceed = true,
  isSubmitting = false,
  finishLabel = "Finish",
  children,
  sidebar,
}: WizardShellProps) {
  const isLast = currentIndex === steps.length - 1;
  return (
    <div className="grid gap-6 lg:grid-cols-[240px_1fr_320px]">
      <aside className="lg:sticky lg:top-20 h-max">
        <ol className="space-y-1">
          {steps.map((s, i) => {
            const done = i < currentIndex;
            const active = i === currentIndex;
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => onStep(i)}
                  className={cn(
                    "w-full flex items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors",
                    active && "bg-primary/10 text-primary font-medium",
                    !active && "hover:bg-muted/50",
                  )}
                >
                  <span
                    className={cn(
                      "grid h-6 w-6 place-items-center rounded-full text-xs shrink-0",
                      done && "bg-primary text-primary-foreground",
                      active && "border-2 border-primary text-primary",
                      !done && !active && "bg-muted text-muted-foreground",
                    )}
                  >
                    {done ? <Check className="h-3 w-3" /> : i + 1}
                  </span>
                  <span className="truncate">{s.label}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </aside>

      <div className="min-w-0">
        <Card>
          <CardContent className="pt-6">{children}</CardContent>
        </Card>
        <div className="mt-4 flex items-center justify-between">
          <Button variant="outline" onClick={onBack} disabled={currentIndex === 0 || isSubmitting}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          {isLast ? (
            <Button onClick={onFinish} disabled={!canProceed || isSubmitting}>
              {isSubmitting ? "Saving…" : finishLabel}
            </Button>
          ) : (
            <Button onClick={onNext} disabled={!canProceed || isSubmitting}>
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </div>

      {sidebar && <aside className="min-w-0">{sidebar}</aside>}
    </div>
  );
}

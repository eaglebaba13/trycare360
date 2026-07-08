import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import {
  Activity, Workflow, PlayCircle, Zap, FileInput, GitBranch,
  CheckSquare, ListTodo, Timer, MessageSquareText, BellRing,
} from "lucide-react";
import { PermissionGuard } from "@/components/permission-guard";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/automation")({
  component: AutomationLayout,
});

const NAV = [
  { to: "/automation", label: "Dashboard", icon: Activity, exact: true },
  { to: "/automation/workflows", label: "Workflows", icon: Workflow },
  { to: "/automation/runs", label: "Runs", icon: PlayCircle },
  { to: "/automation/triggers", label: "Triggers", icon: Zap },
  { to: "/automation/forms", label: "Forms", icon: FileInput },
  { to: "/automation/rules", label: "Rules", icon: GitBranch },
  { to: "/automation/approvals", label: "Approvals", icon: CheckSquare },
  { to: "/automation/tasks", label: "Tasks", icon: ListTodo },
  { to: "/automation/sla", label: "SLA", icon: Timer },
  { to: "/automation/templates", label: "Templates", icon: MessageSquareText },
  { to: "/automation/notifications", label: "Notifications", icon: BellRing },
];

function AutomationLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <PermissionGuard roles={["super_admin", "corporate_admin"]}>
      <div className="p-4 lg:p-8 max-w-[1600px] mx-auto">
        <div className="mb-6">
          <h1 className="font-display text-2xl lg:text-3xl font-semibold tracking-tight">Workflow & Automation Engine</h1>
          <p className="mt-1 text-sm text-muted-foreground max-w-3xl">
            Metadata-driven forms, workflows, rules, approvals, tasks, SLAs, notifications and templates.
            Every business module consumes this engine — none hardcode workflows or messaging logic.
          </p>
        </div>
        <div className="flex flex-wrap gap-1 mb-6 border-b overflow-x-auto">
          {NAV.map((n) => {
            const active = n.exact ? pathname === n.to : pathname.startsWith(n.to);
            const Icon = n.icon;
            return (
              <Link key={n.to} to={n.to}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 text-sm border-b-2 -mb-px transition-colors whitespace-nowrap",
                  active
                    ? "border-primary text-foreground font-medium"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}>
                <Icon className="h-4 w-4" />
                {n.label}
              </Link>
            );
          })}
        </div>
        <Outlet />
      </div>
    </PermissionGuard>
  );
}

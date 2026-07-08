import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Activity, FolderOpen, StickyNote, Search,
  LayoutGrid, FileBarChart, TrendingUp, HardDrive, ShieldCheck,
} from "lucide-react";
import { PermissionGuard } from "@/components/permission-guard";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/data")({
  component: DataLayout,
});

const NAV = [
  { to: "/data", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/data/timeline", label: "Timeline", icon: Activity },
  { to: "/data/documents", label: "Documents", icon: FolderOpen },
  { to: "/data/notes", label: "Notes", icon: StickyNote },
  { to: "/data/search", label: "Search", icon: Search },
  { to: "/data/widgets", label: "Widgets", icon: LayoutGrid },
  { to: "/data/reports", label: "Reports", icon: FileBarChart },
  { to: "/data/analytics", label: "Analytics", icon: TrendingUp },
  { to: "/data/files", label: "Files", icon: HardDrive },
  { to: "/data/audit", label: "Audit", icon: ShieldCheck },
];

function DataLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <PermissionGuard roles={["super_admin", "corporate_admin"]}>
      <div className="p-4 lg:p-8 max-w-[1600px] mx-auto">
        <div className="mb-6">
          <h1 className="font-display text-2xl lg:text-3xl font-semibold tracking-tight">Data, Document & Analytics Foundation</h1>
          <p className="mt-1 text-sm text-muted-foreground max-w-3xl">
            Reusable platform surface — timeline, documents, notes, search, widgets, reports,
            analytics and audit. Every business module reads and writes through these primitives;
            none rolls its own timeline, notes, documents, search, widgets, reports or analytics.
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

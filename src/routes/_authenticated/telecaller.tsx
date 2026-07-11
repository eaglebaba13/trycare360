import { createFileRoute, Outlet, Link, useRouterState } from "@tanstack/react-router";
import { PageContainer } from "@/components/app-shell";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/telecaller")({
  component: TelecallerLayout,
});

const TABS = [
  { to: "/telecaller", label: "Dashboard", exact: true },
  { to: "/telecaller/queue", label: "My Queue" },
  { to: "/telecaller/calendar", label: "Follow-up Calendar" },
  { to: "/telecaller/productivity", label: "Productivity" },
];

function TelecallerLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <PageContainer title="Telecaller Workspace" description="Your leads, your calls, your follow-ups.">
      <div className="border-b mb-4">
        <nav className="flex flex-wrap gap-1">
          {TABS.map((t) => {
            const active = t.exact ? pathname === t.to : pathname.startsWith(t.to);
            return (
              <Link
                key={t.to}
                to={t.to}
                className={cn(
                  "px-3 py-2 text-sm border-b-2 -mb-px",
                  active ? "border-primary text-foreground font-medium" : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {t.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <Outlet />
    </PageContainer>
  );
}

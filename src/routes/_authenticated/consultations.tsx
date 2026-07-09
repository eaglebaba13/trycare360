import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/consultations", label: "Queue", exact: true },
  { to: "/consultations/analytics", label: "Analytics" },
  { to: "/consultations/definitions", label: "Definitions" },
];

export const Route = createFileRoute("/_authenticated/consultations")({
  component: Layout,
});

function Layout() {
  const { pathname } = useLocation();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">AI Digital Consultations</h1>
        <p className="text-sm text-muted-foreground">Manage AI-powered hair, skin, nail and nutrition consultation sessions.</p>
      </div>
      <div className="flex gap-1 border-b">
        {tabs.map((t) => {
          const active = t.exact ? pathname === t.to : pathname.startsWith(t.to);
          return (
            <Link key={t.to} to={t.to} className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
              active ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            )}>{t.label}</Link>
          );
        })}
      </div>
      <Outlet />
    </div>
  );
}

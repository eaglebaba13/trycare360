import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import {
  FileText, LayoutTemplate, Users, Stethoscope, Store, GraduationCap,
  ShoppingBag, Image as ImageIcon, Menu as MenuIcon, ArrowRightLeft, Settings, Inbox,
  LayoutGrid, Blocks, Megaphone, Search, FlaskConical, BarChart3, Send, Radio,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/cms", label: "Overview", icon: LayoutTemplate, exact: true },
  { to: "/cms/pages", label: "Pages", icon: FileText },
  { to: "/cms/templates", label: "Templates", icon: LayoutGrid },
  { to: "/cms/sections", label: "Section library", icon: Blocks },
  { to: "/cms/campaigns", label: "Campaign pages", icon: Megaphone },
  { to: "/cms/blog", label: "Blog posts", icon: FileText },
  { to: "/cms/doctors", label: "Doctors", icon: Users },
  { to: "/cms/treatments", label: "Treatments", icon: Stethoscope },
  { to: "/cms/franchise", label: "Franchise", icon: Store },
  { to: "/cms/academy", label: "Academy", icon: GraduationCap },
  { to: "/cms/products", label: "Products", icon: ShoppingBag },
  { to: "/cms/media", label: "Media", icon: ImageIcon },
  { to: "/cms/menus", label: "Menus", icon: MenuIcon },
  { to: "/cms/redirects", label: "Redirects", icon: ArrowRightLeft },
  { to: "/cms/appointments", label: "Appointment requests", icon: Inbox },
  { to: "/cms/seo", label: "SEO manager", icon: Search },
  { to: "/cms/experiments", label: "A/B experiments", icon: FlaskConical },
  { to: "/cms/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/cms/publishing", label: "Publishing", icon: Send },
  { to: "/cms/tracking", label: "Tracking & pixels", icon: Radio },
  { to: "/cms/settings", label: "Site settings", icon: Settings },
] as const;

export const Route = createFileRoute("/_authenticated/cms")({
  component: CmsLayout,
});

function CmsLayout() {
  const loc = useLocation();
  return (
    <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
      <aside className="lg:sticky lg:top-20 lg:h-fit">
        <div className="mb-3 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Enterprise CMS
        </div>
        <nav className="flex flex-col gap-0.5">
          {NAV.map((n) => {
            const isExact = "exact" in n && n.exact;
            const active = isExact ? loc.pathname === n.to : loc.pathname.startsWith(n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <n.icon className="h-4 w-4" /> {n.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="min-w-0">
        <Outlet />
      </div>
    </div>
  );
}

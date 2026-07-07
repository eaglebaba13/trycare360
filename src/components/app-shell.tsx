import { useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Menu, X, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useSession } from "@/hooks/use-session";
import { usePermissions } from "@/hooks/use-permissions";
import { NAV_GROUPS, filterNav } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { TenantSwitcher } from "./tenant-switcher";
import { NotificationBell } from "./notification-bell";
import { UserMenu } from "./user-menu";

export function AppShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const session = useSession();
  const { roles, permissions } = usePermissions();
  const groups = filterNav(NAV_GROUPS, roles, permissions);

  if (session.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-sm text-muted-foreground">Loading…</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
        <Brand />
        <Sidebar groups={groups} />
      </aside>

      {/* Mobile sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          className="w-72 p-0 bg-sidebar text-sidebar-foreground border-sidebar-border"
        >
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <Brand onNav={() => setMobileOpen(false)} />
          <Sidebar groups={groups} onNav={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b bg-card/60 backdrop-blur flex items-center gap-3 px-4 lg:px-6 sticky top-0 z-20">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="hidden md:block">
            <TenantSwitcher />
          </div>
          <div className="flex-1" />
          <NotificationBell />
          <UserMenu />
        </header>

        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}

function Brand({ onNav }: { onNav?: () => void }) {
  return (
    <div className="h-16 flex items-center gap-2.5 px-5 border-b border-sidebar-border">
      <Link
        to="/dashboard"
        onClick={onNav}
        className="flex items-center gap-2.5 group"
      >
        <div className="h-9 w-9 rounded-lg bg-gold text-gold-foreground grid place-items-center shadow-elev-1">
          <Stethoscope className="h-5 w-5" />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="font-display text-base font-semibold tracking-tight">
            TryCare<span className="text-gold">360</span>
          </span>
          <span className="text-[10px] text-sidebar-foreground/60 uppercase tracking-wider">
            Healthcare Network
          </span>
        </div>
      </Link>
    </div>
  );
}

function Sidebar({
  groups,
  onNav,
}: {
  groups: ReturnType<typeof filterNav>;
  onNav?: () => void;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <ScrollArea className="flex-1">
      <nav className="p-3 space-y-6">
        {groups.map((g) => (
          <div key={g.label}>
            <div className="px-3 mb-2 text-[10px] uppercase tracking-wider text-sidebar-foreground/50 font-medium">
              {g.label}
            </div>
            <ul className="space-y-0.5">
              {g.items.map((item) => {
                const active = pathname.startsWith(item.to);
                const Icon = item.icon;
                return (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      onClick={onNav}
                      className={cn(
                        "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors",
                        active
                          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                          : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </ScrollArea>
  );
}

/** Standard content wrapper for page bodies. */
export function PageContainer({
  title,
  description,
  actions,
  children,
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="p-4 lg:p-8 max-w-[1600px] mx-auto">
      {(title || actions) && (
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            {title && (
              <h1 className="font-display text-2xl lg:text-3xl font-semibold tracking-tight">
                {title}
              </h1>
            )}
            {description && (
              <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
                {description}
              </p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

/**
 * Patient Portal — Shell, header, tabs, status bar, and shared layout
 * primitives. Renders inside AppShell via the /_authenticated/patient
 * layout route. All data comes from Stage 2 server functions.
 */
import type { ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  UserRound,
  Users,
  FileText,
  Wallet,
  Star,
  Gift,
  HeartPulse,
  Activity,
  Pill,
  FlaskConical,
  ScanLine,
  Microscope,
  CalendarDays,
  Video,
  Bell,
  Headphones,
  MessageSquare,
  Settings,
  Smartphone,
  ShieldCheck,
  Badge as BadgeIcon,
  Receipt,
  Crown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageContainer } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { initials } from "@/lib/standards-format";
import { getMyPatientProfile } from "@/lib/patient/profile.functions";

type PatientTab = { to: string; label: string; exact?: boolean; icon: typeof LayoutDashboard };
export const PATIENT_TABS: readonly PatientTab[] = [
  { to: "/patient", label: "Home", exact: true, icon: LayoutDashboard },
  { to: "/patient/appointments", label: "Appointments", icon: CalendarDays },
  { to: "/patient/teleconsult", label: "Teleconsult", icon: Video },
  { to: "/patient/records", label: "Records", icon: HeartPulse },
  { to: "/patient/prescriptions", label: "Prescriptions", icon: Pill },
  { to: "/patient/lab-reports", label: "Lab", icon: FlaskConical },
  { to: "/patient/radiology", label: "Radiology", icon: ScanLine },
  { to: "/patient/pathology", label: "Pathology", icon: Microscope },
  { to: "/patient/health", label: "Health", icon: Activity },
  { to: "/patient/documents", label: "Documents", icon: FileText },
  { to: "/patient/payments", label: "Payments", icon: Receipt },
  { to: "/patient/wallet", label: "Wallet", icon: Wallet },
  { to: "/patient/membership", label: "Membership", icon: Crown },
  { to: "/patient/loyalty", label: "Loyalty", icon: Star },
  { to: "/patient/rewards", label: "Rewards", icon: Gift },
  { to: "/patient/family", label: "Family", icon: Users },
  { to: "/patient/notifications", label: "Notifications", icon: Bell },
  { to: "/patient/support", label: "Support", icon: Headphones },
  { to: "/patient/feedback", label: "Feedback", icon: MessageSquare },
  { to: "/patient/consents", label: "Consents", icon: ShieldCheck },
  { to: "/patient/passport", label: "Passport", icon: BadgeIcon },
  { to: "/patient/devices", label: "Devices", icon: Smartphone },
  { to: "/patient/profile", label: "Profile", icon: UserRound },
  { to: "/patient/settings", label: "Settings", icon: Settings },
];

export function PatientTabs() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <ScrollArea className="w-full">
      <nav className="flex gap-1 border-b min-w-max">
        {PATIENT_TABS.map((t) => {
          const active = t.exact ? pathname === t.to : pathname.startsWith(t.to);
          const Icon = t.icon;
          return (
            <Link
              key={t.to}
              to={t.to}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 text-sm border-b-2 -mb-px whitespace-nowrap",
                active
                  ? "border-primary text-foreground font-medium"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" /> {t.label}
            </Link>
          );
        })}
      </nav>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}

export function PatientHeader() {
  const fn = useServerFn(getMyPatientProfile);
  const q = useQuery({
    queryKey: ["patient-portal-profile"],
    queryFn: () => fn({}),
    staleTime: 60_000,
  });
  const p = (q.data as { profile: {
    display_name: string | null;
    avatar_url: string | null;
    bio: string | null;
    locale: string | null;
  } | null } | undefined)?.profile;
  const name = p?.display_name ?? "My Health";
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-center gap-3">
        <Avatar className="h-14 w-14">
          {p?.avatar_url && <AvatarImage src={p.avatar_url} alt={name} />}
          <AvatarFallback>{initials(name)}</AvatarFallback>
        </Avatar>
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">{name}</h1>
          <p className="text-sm text-muted-foreground">
            {p?.bio ?? "Your personal health & care workspace."}
          </p>
        </div>
      </div>
    </div>
  );
}

export function PatientStatusBar({ items }: { items: { label: string; value: string; tone?: string }[] }) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {items.map((it) => (
        <Badge key={it.label} variant="outline" className={cn("gap-1", it.tone)}>
          <span className="text-muted-foreground">{it.label}:</span>
          <span className="font-medium text-foreground">{it.value}</span>
        </Badge>
      ))}
    </div>
  );
}

export function PatientActionBar({ children }: { children?: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2">{children}</div>;
}

export function PatientShell({
  title,
  description,
  actions,
  status,
  children,
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  status?: ReactNode;
  children: ReactNode;
}) {
  return (
    <PageContainer>
      <div className="space-y-4">
        <PatientHeader />
        <PatientTabs />
        {(title || actions || status) && (
          <div className="flex flex-wrap items-start justify-between gap-3 pt-2">
            <div>
              {title && <h2 className="text-lg font-semibold">{title}</h2>}
              {description && <p className="text-sm text-muted-foreground">{description}</p>}
              {status && <div className="mt-2">{status}</div>}
            </div>
            {actions && <div className="flex items-center gap-2">{actions}</div>}
          </div>
        )}
        <div>{children}</div>
      </div>
    </PageContainer>
  );
}

/** Simple placeholder used by lightly-populated workspaces. */
export function PatientEmpty({ title, hint }: { title: string; hint?: string }) {
  return (
    <Card>
      <CardContent className="py-10 text-center space-y-1">
        <div className="text-sm font-medium">{title}</div>
        {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
      </CardContent>
    </Card>
  );
}

export function PatientSidebar() {
  return <PatientTabs />;
}

export function PatientDashboardCards({ children }: { children: ReactNode }) {
  return <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{children}</div>;
}

export function PatientSummaryBar({ items }: { items: { label: string; value: string }[] }) {
  return <PatientStatusBar items={items} />;
}

export function PatientFilterBar({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2 mb-3">{children}</div>;
}

export function PatientNotificationsBell() {
  return null;
}

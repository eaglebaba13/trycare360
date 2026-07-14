/** Patient Portal — Dashboard aggregation view. */
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { CalendarPlus, Video, FileText, Wallet, Bell } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { KpiCard, KpiGrid } from "@/components/standards/kpi-card";
import { getPatientPortalDashboard } from "@/lib/patient/dashboard.functions";
import { formatDate, formatDateTime } from "@/lib/standards-format";
import { PatientShell, PatientDashboardCards } from "./shell";

type Row = Record<string, unknown>;
type Dash = {
  patient: Row | null;
  upcomingAppointments: Row[];
  labReports: Row[];
  radiologyReports: Row[];
  activePrescriptions: Row[];
  invoices: Row[];
  payments: Row[];
  wallet: { balance?: number; currency?: string } | null;
  memberships: Row[];
  rewards: Row[];
  documents: Row[];
  notifications: Row[];
  healthGoals: Row[];
  permissions: { canView: boolean; canBook: boolean; canPay: boolean; canManage: boolean };
};

function useDashboard() {
  const fn = useServerFn(getPatientPortalDashboard);
  return useQuery({
    queryKey: ["patient-portal-dashboard"],
    queryFn: () => fn({ data: {} }) as unknown as Promise<Dash>,
    staleTime: 30_000,
  });
}

export function QuickActions() {
  return (
    <div className="flex flex-wrap gap-2">
      <Button asChild size="sm"><Link to="/patient/appointments"><CalendarPlus className="h-4 w-4 mr-1.5" />Book</Link></Button>
      <Button asChild size="sm" variant="outline"><Link to="/patient/teleconsult"><Video className="h-4 w-4 mr-1.5" />Teleconsult</Link></Button>
      <Button asChild size="sm" variant="outline"><Link to="/patient/documents"><FileText className="h-4 w-4 mr-1.5" />Documents</Link></Button>
      <Button asChild size="sm" variant="outline"><Link to="/patient/wallet"><Wallet className="h-4 w-4 mr-1.5" />Wallet</Link></Button>
      <Button asChild size="sm" variant="outline"><Link to="/patient/notifications"><Bell className="h-4 w-4 mr-1.5" />Alerts</Link></Button>
    </div>
  );
}

function ListCard({ title, items, empty, render, viewTo }: {
  title: string; items: Row[]; empty: string; render: (r: Row) => { primary: string; secondary?: string };
  viewTo?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
        {viewTo && <Link to={viewTo} className="text-xs text-primary hover:underline">View all</Link>}
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="text-xs text-muted-foreground py-6 text-center">{empty}</div>
        ) : (
          <ul className="divide-y">
            {items.slice(0, 5).map((r, i) => {
              const { primary, secondary } = render(r);
              return (
                <li key={i} className="py-2">
                  <div className="text-sm truncate">{primary}</div>
                  {secondary && <div className="text-xs text-muted-foreground truncate">{secondary}</div>}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function UpcomingAppointmentsCard({ items }: { items: Row[] }) {
  return <ListCard title="Upcoming Appointments" items={items} empty="Nothing scheduled." viewTo="/patient/appointments"
    render={(r) => ({ primary: String(r.reason ?? r.appointment_type_id ?? "Appointment"), secondary: formatDateTime(String(r.starts_at ?? "")) })} />;
}
export function RecentReportsCard({ items }: { items: Row[] }) {
  return <ListCard title="Recent Reports" items={items} empty="No reports yet." viewTo="/patient/records"
    render={(r) => ({ primary: String(r.title ?? r.name ?? "Report"), secondary: formatDate(String(r.created_at ?? r.reported_at ?? "")) })} />;
}
export function HealthGoalsCard({ items }: { items: Row[] }) {
  return <ListCard title="Health Goals" items={items} empty="No goals yet." viewTo="/patient/health"
    render={(r) => ({ primary: String(r.title ?? r.goal_type ?? "Goal"), secondary: r.target_value ? `Target ${String(r.target_value)}` : undefined })} />;
}
export function WalletCard({ wallet }: { wallet: Dash["wallet"] }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">Wallet</CardTitle></CardHeader>
      <CardContent>
        <div className="text-3xl font-semibold tabular-nums">
          {wallet?.currency ?? "INR"} {(wallet?.balance ?? 0).toLocaleString()}
        </div>
        <Link to="/patient/wallet" className="text-xs text-primary hover:underline">Manage wallet</Link>
      </CardContent>
    </Card>
  );
}
export function MembershipCard({ items }: { items: Row[] }) {
  const active = items[0];
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">Membership</CardTitle></CardHeader>
      <CardContent>
        {active ? (
          <>
            <div className="font-medium">{String(active.plan_name ?? "Active plan")}</div>
            <div className="text-xs text-muted-foreground">Expires {formatDate(String(active.expires_at ?? ""))}</div>
          </>
        ) : (
          <div className="text-xs text-muted-foreground">No active membership.</div>
        )}
        <Link to="/patient/membership" className="text-xs text-primary hover:underline">View benefits</Link>
      </CardContent>
    </Card>
  );
}
export function LoyaltyCard() {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">Loyalty</CardTitle></CardHeader>
      <CardContent><Link to="/patient/loyalty" className="text-xs text-primary hover:underline">Open loyalty →</Link></CardContent>
    </Card>
  );
}
export function RewardsCard({ items }: { items: Row[] }) {
  return <ListCard title="Rewards" items={items} empty="No redemptions." viewTo="/patient/rewards"
    render={(r) => ({ primary: String(r.reward_name ?? r.name ?? "Reward"), secondary: formatDate(String(r.redeemed_at ?? r.created_at ?? "")) })} />;
}
export function NotificationsCard({ items }: { items: Row[] }) {
  return <ListCard title="Notifications" items={items} empty="Nothing new." viewTo="/patient/notifications"
    render={(r) => ({ primary: String(r.title ?? r.subject ?? "Notification"), secondary: r.body ? String(r.body).slice(0, 80) : undefined })} />;
}
export function HealthPassportCard() {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">Health Passport</CardTitle></CardHeader>
      <CardContent><Link to="/patient/passport" className="text-xs text-primary hover:underline">Open passport →</Link></CardContent>
    </Card>
  );
}

export function PatientDashboard() {
  const q = useDashboard();
  const d = q.data;
  return (
    <PatientShell title="My Health" description="Everything about your care in one place." actions={<QuickActions />}>
      {q.isLoading || !d ? (
        <div className="grid gap-4 md:grid-cols-3"><Skeleton className="h-40" /><Skeleton className="h-40" /><Skeleton className="h-40" /></div>
      ) : (
        <div className="space-y-4">
          <KpiGrid>
            <KpiCard label="Upcoming" value={d.upcomingAppointments.length} />
            <KpiCard label="Active Rx" value={d.activePrescriptions.length} />
            <KpiCard label="Reports" value={d.labReports.length + d.radiologyReports.length} />
            <KpiCard label="Invoices" value={d.invoices.length} />
          </KpiGrid>
          <PatientDashboardCards>
            <UpcomingAppointmentsCard items={d.upcomingAppointments} />
            <RecentReportsCard items={[...d.labReports, ...d.radiologyReports]} />
            <HealthGoalsCard items={d.healthGoals} />
            <WalletCard wallet={d.wallet} />
            <MembershipCard items={d.memberships} />
            <LoyaltyCard />
            <RewardsCard items={d.rewards} />
            <NotificationsCard items={d.notifications} />
            <HealthPassportCard />
          </PatientDashboardCards>
          {d.permissions && (
            <div className="flex gap-2 text-xs text-muted-foreground">
              {(["canView","canBook","canPay","canManage"] as const).map((k) =>
                <Badge key={k} variant="outline">{k}: {String(d.permissions[k])}</Badge>)}
            </div>
          )}
        </div>
      )}
    </PatientShell>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { PageContainer } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSession } from "@/hooks/use-session";
import { ROLE_LABELS, type RoleCode } from "@/lib/rbac";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const { data } = useSession();

  return (
    <PageContainer
      title={`Welcome${data?.profile?.full_name ? `, ${data.profile.full_name.split(" ")[0]}` : ""}`}
      description="Phase 1 infrastructure is live. Role-specific dashboards, CRM, clinical and ERP modules ship in the next phases."
    >
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Your roles" value={data?.roles.length ?? 0} />
        <StatCard label="Permissions" value={data?.permissions.length ?? 0} />
        <StatCard label="Tenants" value={data?.tenants.length ?? 0} />
        <StatCard label="Unread notifications" value={data?.unreadNotifications ?? 0} />
      </div>

      <div className="grid gap-4 mt-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Assigned roles</CardTitle>
          </CardHeader>
          <CardContent>
            {data?.roles.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No roles assigned yet. Ask a Super Admin to grant you access.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {data?.roles.map((r) => (
                  <Badge key={`${r.role_code}-${r.org_unit_id}`} variant="secondary">
                    {ROLE_LABELS[r.role_code as RoleCode] ?? r.role_code}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Phase 1 status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Status label="Database schema" ok />
            <Status label="Authentication (Email + Google)" ok />
            <Status label="Multi-tenant + Org hierarchy" ok />
            <Status label="Enterprise RBAC + RLS" ok />
            <Status label="Audit trail" ok />
            <Status label="Notifications framework" ok />
            <Status label="File storage" ok />
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <div className="mt-2 font-display text-3xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
}

function Status({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span>{label}</span>
      <Badge variant={ok ? "default" : "outline"}>{ok ? "Ready" : "Pending"}</Badge>
    </div>
  );
}

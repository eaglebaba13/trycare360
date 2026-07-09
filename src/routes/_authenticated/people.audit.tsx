import { createFileRoute } from "@tanstack/react-router";
import { PageContainer } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/people/audit")({
  component: AuditPage,
});

function AuditPage() {
  return (
    <PageContainer title="Identity audit" description="Audit trail across the identity domain.">
      <Card>
        <CardContent className="pt-6 text-sm text-muted-foreground">
          Audit rows from <code className="font-mono">audit_logs</code> filtered to the identity domain
          are surfaced here. Reuses the existing Data → Audit page filters.
        </CardContent>
      </Card>
    </PageContainer>
  );
}

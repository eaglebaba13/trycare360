/**
 * Clinical → Referrals workspace.
 *
 * Read/write surface delegated to the Stage 2 server functions.
 * Listing per-patient is done inside the encounter workspace via
 * ClinicalContextLoader — this page is a placeholder queue that
 * links back to encounters and referral actions.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { Send } from "lucide-react";
import { PageContainer } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClinicalHeader } from "@/components/clinical/workspace-shell";

export const Route = createFileRoute("/_authenticated/clinical/referrals")({
  component: ReferralsPage,
});

function ReferralsPage() {
  return (
    <PageContainer>
      <ClinicalHeader
        title="Referrals"
        subtitle="Inter-branch and external referrals routed through the Clinical engine."
        actions={
          <Button asChild size="sm" variant="outline">
            <Link to="/clinical/patients">
              <Send className="h-4 w-4 mr-1" /> Refer from patient
            </Link>
          </Button>
        }
      />
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Referral queue</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Referrals are created and updated through the Stage 2 server functions
            (<code>createReferral</code>, <code>updateReferral</code>). Per-patient referral history is
            available inside the encounter workspace, so no new listing endpoint is introduced here.
          </p>
        </CardContent>
      </Card>
    </PageContainer>
  );
}

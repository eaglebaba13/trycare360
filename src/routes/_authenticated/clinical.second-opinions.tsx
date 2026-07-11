/**
 * Clinical → Second Opinions workspace.
 *
 * Read/write via the Stage 2 server functions. Per-patient history is
 * available through the encounter workspace which uses the single
 * ClinicalContextLoader — no duplicate listing endpoint.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { Stethoscope } from "lucide-react";
import { PageContainer } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClinicalHeader } from "@/components/clinical/workspace-shell";

export const Route = createFileRoute("/_authenticated/clinical/second-opinions")({
  component: SecondOpinionsPage,
});

function SecondOpinionsPage() {
  return (
    <PageContainer>
      <ClinicalHeader
        title="Second Opinions"
        subtitle="Requests to and from other doctors and franchises."
        actions={
          <Button asChild size="sm" variant="outline">
            <Link to="/clinical/patients">
              <Stethoscope className="h-4 w-4 mr-1" /> Request from patient
            </Link>
          </Button>
        }
      />
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Pipeline</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Second opinions are created and answered via the Stage 2 server functions
            (<code>requestSecondOpinion</code>, <code>respondSecondOpinion</code>) inside the
            encounter workspace. This page will surface the cross-tenant pipeline once the
            aggregation view is wired.
          </p>
        </CardContent>
      </Card>
    </PageContainer>
  );
}

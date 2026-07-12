/**
 * Clinical → AI Assistant Overview
 *
 * A tenant-wide dashboard that lets clinicians browse AI activity,
 * inspect prompt templates, and review conversation logs. Individual
 * patient/encounter-scoped assistance lives inside the Encounter
 * Workspace via the ClinicalAssistantPanel.
 */
import { createFileRoute } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { PageContainer } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AIConversationPanel,
  PromptInspector,
} from "@/components/clinical/ai-assistant";
import { ClinicalHeader } from "@/components/clinical/workspace-shell";
import { useTenant } from "@/hooks/use-tenant";

export const Route = createFileRoute("/_authenticated/clinical/assistant")({
  component: AssistantPage,
});

function AssistantPage() {
  const { activeTenantId } = useTenant();
  return (
    <PageContainer>
      <ClinicalHeader
        title="Clinical AI Assistant"
        subtitle="Advisory-only. Clinicians confirm every action."
      />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" /> How it works
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>
                The Clinical AI Assistant reads the current 360° clinical context and
                suggests documentation, differentials, contraindications and follow-ups.
                Every response is stored with model, prompt template, tokens, latency and
                clinician feedback, and is available for audit.
              </p>
              <p>
                Nothing is applied to the EMR automatically. Suggestions live under
                "Recommendations" until a clinician accepts, edits or rejects them.
              </p>
            </CardContent>
          </Card>
          <AIConversationPanel tenantId={activeTenantId} />
        </div>
        <div className="space-y-4">
          <PromptInspector tenantId={activeTenantId} />
        </div>
      </div>
    </PageContainer>
  );
}

/**
 * Clinical → AI Recommendations queue.
 *
 * Tenant-wide list of AI suggestions across encounters, filterable by
 * kind and status. Accept / reject / archive actions call the Stage 5
 * server functions; nothing is applied to the EMR automatically.
 */
import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageContainer } from "@/components/app-shell";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ClinicalHeader } from "@/components/clinical/workspace-shell";
import { RecommendationPanel } from "@/components/clinical/ai-assistant";
import { useTenant } from "@/hooks/use-tenant";
import { REC_KINDS, REC_STATUSES } from "@/lib/clinical/stage5.validators";

export const Route = createFileRoute("/_authenticated/clinical/recommendations")({
  component: RecommendationsPage,
});

function RecommendationsPage() {
  const { activeTenantId } = useTenant();
  const [kind, setKind] = useState<string>("all");
  const [status, setStatus] = useState<string>("suggested");
  return (
    <PageContainer>
      <ClinicalHeader
        title="AI Recommendations"
        subtitle="Clinician-driven review queue. Advisory only."
        actions={
          <div className="flex gap-2">
            <Select value={kind} onValueChange={setKind}>
              <SelectTrigger className="h-8 w-40 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All kinds</SelectItem>
                {REC_KINDS.map((k) => (
                  <SelectItem key={k} value={k}>{k}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-8 w-36 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {REC_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <RecommendationPanel
          tenantId={activeTenantId}
          kind={kind === "all" ? undefined : kind}
          title={`Recommendations (${status})`}
        />
      </div>
    </PageContainer>
  );
}

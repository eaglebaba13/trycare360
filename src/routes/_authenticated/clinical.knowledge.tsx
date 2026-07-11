/**
 * Clinical → Knowledge browser.
 *
 * Read-only explorer for the tenant-inheritable Clinical Knowledge
 * Layer built in Stage 1. Uses the existing `listClinicalKnowledge`
 * server function only — no new endpoints.
 */
import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BookOpen, Search } from "lucide-react";
import { PageContainer } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ClinicalHeader } from "@/components/clinical/workspace-shell";
import { useTenant } from "@/hooks/use-tenant";
import { listClinicalKnowledge } from "@/lib/clinical/clinical.functions";

const KINDS = [
  "soap_templates",
  "diagnosis_templates",
  "treatment_protocols",
  "procedure_checklists",
  "consent_templates",
  "prescription_templates",
  "nutrition_plan_templates",
  "followup_templates",
  "ai_prompt_templates",
  "anatomy_grids",
  "scoring_scales",
  "contraindication_rules",
  "protocols",
  "codes",
  "code_systems",
] as const;

type Kind = (typeof KINDS)[number];

export const Route = createFileRoute("/_authenticated/clinical/knowledge")({
  component: KnowledgePage,
});

function KnowledgePage() {
  const { activeTenantId } = useTenant();
  const [kind, setKind] = useState<Kind>("soap_templates");
  const [q, setQ] = useState("");
  const fn = useServerFn(listClinicalKnowledge);
  const res = useQuery({
    queryKey: ["clinical-knowledge", activeTenantId, kind, q],
    queryFn: () =>
      fn({
        data: {
          tenantId: activeTenantId!,
          kind,
          search: q || undefined,
          activeOnly: true,
          limit: 200,
          offset: 0,
        },
      }),
    enabled: Boolean(activeTenantId),
    staleTime: 30_000,
  });

  return (
    <PageContainer>
      <ClinicalHeader
        title="Clinical Knowledge"
        subtitle="Global and tenant-scoped clinical dictionaries and templates."
      />
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <BookOpen className="h-4 w-4" /> Browse
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 md:grid-cols-[220px_1fr]">
            <Select value={kind} onValueChange={(v) => setKind(v as Kind)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {KINDS.map((k) => (
                  <SelectItem key={k} value={k}>
                    {k.replaceAll("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Filter by name or code…"
                className="pl-9"
              />
            </div>
          </div>
          {res.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <ul className="divide-y">
              {(res.data?.rows ?? []).map((row, i) => {
                const r = row as Record<string, unknown>;
                const id = String(r.id ?? i);
                const name = String(r.name ?? r.display ?? r.code ?? id);
                const code = r.code ? String(r.code) : null;
                const isGlobal = r.tenant_id == null;
                return (
                  <li key={id} className="flex items-center justify-between gap-2 py-2">
                    <div className="min-w-0">
                      <div className="text-sm truncate">{name}</div>
                      {code && <div className="text-[11px] font-mono text-muted-foreground truncate">{code}</div>}
                    </div>
                    <Badge variant={isGlobal ? "secondary" : "outline"} className="text-[10px]">
                      {isGlobal ? "GLOBAL" : "TENANT"}
                    </Badge>
                  </li>
                );
              })}
              {(res.data?.rows ?? []).length === 0 && (
                <li className="text-sm text-muted-foreground py-6 text-center">Nothing here yet.</li>
              )}
            </ul>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}

/**
 * Clinical / EMR — Stage 5 UI (AI Clinical Assistant).
 *
 * All AI components live here to keep the surface area cohesive and
 * ensure no component forks its own data-loading path. Every panel
 * reads through `useClinicalContext` (Stage 2 loader) and calls the
 * Stage 5 server functions only. Nothing is applied to the EMR
 * automatically — every suggestion is clinician-confirmed.
 */
import { useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  BookOpen,
  Brain,
  Check,
  Loader2,
  MessageSquareText,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  Wand2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Tables } from "@/integrations/supabase/types";
import type { ClinicalContextData } from "./use-clinical-context";
import {
  listAiConversations,
  listAiRecommendations,
  listAiPromptTemplates,
  runClinicalAssistant,
  setAiRecommendationStatus,
  submitAiConversationFeedback,
} from "@/lib/clinical/stage5.functions";

type Recommendation = Tables<"clinical_ai_recommendations">;
type Conversation = Tables<"clinical_ai_conversations">;
type PromptTemplate = Tables<"clinical_ai_prompt_templates">;

// ---------------------------------------------------------------------------
// Confidence indicator (0..1)
// ---------------------------------------------------------------------------
export function ConfidenceIndicator({ value }: { value?: number | null }) {
  if (value == null) return <Badge variant="outline" className="text-[10px]">unrated</Badge>;
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  const tone =
    pct >= 75 ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
    : pct >= 40 ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
    : "bg-rose-500/15 text-rose-700 dark:text-rose-400";
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${tone}`}>
      {pct}% confidence
    </span>
  );
}

// ---------------------------------------------------------------------------
// Assistant panel — right-column primary surface
// ---------------------------------------------------------------------------
const QUICK_ACTIONS: Array<{ purpose: string; label: string; save?: boolean }> = [
  { purpose: "encounter_summary", label: "Encounter summary" },
  { purpose: "soap_draft", label: "Draft SOAP" },
  { purpose: "soap_improve", label: "Improve SOAP" },
  { purpose: "differential", label: "Differential Dx", save: true },
  { purpose: "treatment_suggestion", label: "Treatment options", save: true },
  { purpose: "contraindication_check", label: "Contraindications", save: true },
  { purpose: "clinical_checklist", label: "Safety checklist", save: true },
  { purpose: "followup_suggestion", label: "Follow-up ideas", save: true },
  { purpose: "referral_letter", label: "Referral letter" },
  { purpose: "visit_summary", label: "Visit summary" },
];

export function ClinicalAssistantPanel({ ctx }: { ctx: ClinicalContextData | undefined }) {
  const qc = useQueryClient();
  const runFn = useServerFn(runClinicalAssistant);
  const [notes, setNotes] = useState("");
  const [lastPurpose, setLastPurpose] = useState<string | null>(null);
  const tenantId = ctx?.person ? undefined : undefined;
  const t = ctx?.encounter?.tenant_id ?? ctx?.patient?.tenant_id ?? null;
  const encounterId = ctx?.encounter?.id ?? null;
  const patientId = ctx?.person?.id ?? null;

  const run = useMutation({
    mutationFn: (args: { purpose: string; save: boolean }) =>
      runFn({
        data: {
          tenantId: t!,
          encounterId: encounterId ?? undefined,
          patientId: patientId ?? undefined,
          purpose: args.purpose,
          extraInstructions: notes.trim() || undefined,
          saveRecommendations: args.save,
        },
      }),
    onSuccess: (res, vars) => {
      setLastPurpose(vars.purpose);
      qc.invalidateQueries({ queryKey: ["ai-conversations"] });
      qc.invalidateQueries({ queryKey: ["ai-recommendations"] });
      if (!res.ok) toast.error(res.error ?? "AI request failed");
      else toast.success("Assistant response ready");
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "AI request failed"),
  });

  const disabled = !t || (!encounterId && !patientId);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-primary" /> Clinical AI Assistant
          <Badge variant="outline" className="ml-auto text-[10px]">advisory only</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-1.5">
          {QUICK_ACTIONS.map((a) => (
            <Button
              key={a.purpose}
              size="sm"
              variant={lastPurpose === a.purpose ? "default" : "outline"}
              className="h-8 text-[11px] justify-start"
              disabled={disabled || run.isPending}
              onClick={() => run.mutate({ purpose: a.purpose, save: a.save ?? false })}
            >
              {run.isPending && lastPurpose === a.purpose ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <Wand2 className="h-3 w-3 mr-1" />
              )}
              {a.label}
            </Button>
          ))}
        </div>

        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional instructions to steer the assistant…"
          className="text-xs min-h-[60px]"
          disabled={disabled}
        />

        {run.data && (
          <AssistantResponseView
            conversationId={run.data.conversation.id}
            tenantId={t!}
            text={run.data.responseText}
            recommendationsCount={run.data.recommendations.length}
            ok={run.data.ok}
            error={run.data.error ?? null}
          />
        )}
        {disabled && (
          <p className="text-[11px] text-muted-foreground">
            Load a patient or encounter to use the assistant.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function AssistantResponseView(props: {
  conversationId: string;
  tenantId: string;
  text: string;
  recommendationsCount: number;
  ok: boolean;
  error: string | null;
}) {
  const fn = useServerFn(submitAiConversationFeedback);
  const qc = useQueryClient();
  const mut = useMutation({
    mutationFn: (feedback: "up" | "down") =>
      fn({ data: { tenantId: props.tenantId, id: props.conversationId, feedback } }),
    onSuccess: () => {
      toast.success("Feedback recorded");
      qc.invalidateQueries({ queryKey: ["ai-conversations"] });
    },
  });
  return (
    <div className="rounded-md border bg-muted/30 p-2 space-y-2">
      {!props.ok && (
        <div className="text-[11px] text-destructive">{props.error ?? "Request failed"}</div>
      )}
      {props.ok && (
        <ScrollArea className="max-h-56">
          <pre className="whitespace-pre-wrap text-[11px] leading-snug font-sans">{props.text}</pre>
        </ScrollArea>
      )}
      {props.recommendationsCount > 0 && (
        <p className="text-[11px] text-muted-foreground">
          {props.recommendationsCount} suggestion(s) stored — review in the Recommendations panel.
        </p>
      )}
      <div className="flex items-center gap-1">
        <Button size="sm" variant="ghost" className="h-6 px-2" onClick={() => mut.mutate("up")}>
          <ThumbsUp className="h-3 w-3" />
        </Button>
        <Button size="sm" variant="ghost" className="h-6 px-2" onClick={() => mut.mutate("down")}>
          <ThumbsDown className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Encounter summary card (uses the AI Assistant to produce a plain-text summary)
// ---------------------------------------------------------------------------
export function EncounterSummaryCard({ ctx }: { ctx: ClinicalContextData | undefined }) {
  const runFn = useServerFn(runClinicalAssistant);
  const t = ctx?.encounter?.tenant_id ?? ctx?.patient?.tenant_id ?? null;
  const encounterId = ctx?.encounter?.id ?? null;
  const [text, setText] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const run = async () => {
    if (!t) return;
    setLoading(true);
    try {
      const res = await runFn({
        data: {
          tenantId: t,
          encounterId: encounterId ?? undefined,
          purpose: "encounter_summary",
        },
      });
      setText(res.responseText || (res.error ?? ""));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2 flex-row items-center gap-2">
        <CardTitle className="text-sm flex items-center gap-1.5">
          <MessageSquareText className="h-3.5 w-3.5" /> Encounter Summary
        </CardTitle>
        <Button size="sm" variant="outline" className="ml-auto h-7 text-[11px]" onClick={run} disabled={!t || loading}>
          {loading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Wand2 className="h-3 w-3 mr-1" />}
          Generate
        </Button>
      </CardHeader>
      <CardContent>
        {text ? (
          <pre className="whitespace-pre-wrap text-xs leading-snug font-sans">{text}</pre>
        ) : (
          <p className="text-xs text-muted-foreground">
            Generate an AI-drafted summary of the current encounter. Clinician review required before sharing.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// SOAP Assistant — thin action pair that hits soap_draft / soap_improve.
// The actual editing lives in the existing SoapEditor. This panel is
// display-only and never writes to the SOAP note.
// ---------------------------------------------------------------------------
export function SOAPAssistant({ ctx }: { ctx: ClinicalContextData | undefined }) {
  const t = ctx?.encounter?.tenant_id ?? null;
  const encounterId = ctx?.encounter?.id ?? null;
  const fn = useServerFn(runClinicalAssistant);
  const [draft, setDraft] = useState<string>("");
  const [busy, setBusy] = useState<"draft" | "improve" | null>(null);

  const call = async (purpose: "soap_draft" | "soap_improve") => {
    if (!t || !encounterId) return;
    setBusy(purpose === "soap_draft" ? "draft" : "improve");
    try {
      const res = await fn({ data: { tenantId: t, encounterId, purpose } });
      setDraft(res.responseText || (res.error ?? ""));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2 flex-row items-center gap-2">
        <CardTitle className="text-sm flex items-center gap-1.5">
          <Brain className="h-3.5 w-3.5" /> SOAP Assistant
        </CardTitle>
        <div className="ml-auto flex gap-1">
          <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => call("soap_draft")} disabled={!encounterId || !!busy}>
            {busy === "draft" ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : null}
            Draft
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => call("soap_improve")} disabled={!encounterId || !!busy}>
            {busy === "improve" ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : null}
            Improve
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {draft ? (
          <ScrollArea className="max-h-56">
            <pre className="whitespace-pre-wrap text-[11px] leading-snug font-sans">{draft}</pre>
          </ScrollArea>
        ) : (
          <p className="text-xs text-muted-foreground">
            Draft or improve the SOAP note. Copy into the editor manually — the assistant never overwrites clinician notes.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Recommendation panel — lists suggested items + accept / reject / archive.
// Filter by `kind` to build DiagnosisSuggestionPanel, TreatmentSuggestionPanel,
// ClinicalChecklistPanel.
// ---------------------------------------------------------------------------
export function RecommendationPanel(props: {
  tenantId: string | null;
  encounterId?: string | null;
  patientId?: string | null;
  kind?: string;
  title?: string;
  emptyLabel?: string;
}) {
  const listFn = useServerFn(listAiRecommendations);
  const statusFn = useServerFn(setAiRecommendationStatus);
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: [
      "ai-recommendations",
      props.tenantId,
      props.encounterId ?? null,
      props.patientId ?? null,
      props.kind ?? null,
    ],
    queryFn: () =>
      listFn({
        data: {
          tenantId: props.tenantId!,
          encounterId: props.encounterId ?? undefined,
          patientId: props.patientId ?? undefined,
          kind: (props.kind ?? undefined) as never,
        },
      }),
    enabled: Boolean(props.tenantId),
  });

  const setStatus = useMutation({
    mutationFn: (args: { id: string; status: "accepted" | "rejected" | "archived" }) =>
      statusFn({ data: { tenantId: props.tenantId!, id: args.id, status: args.status } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai-recommendations"] });
      toast.success("Recommendation updated");
    },
  });

  const rows = (q.data?.rows ?? []) as Recommendation[];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5" /> {props.title ?? "AI Recommendations"}
          {props.kind && <Badge variant="outline" className="text-[10px]">{props.kind}</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {q.isLoading ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" /> Loading…
          </div>
        ) : rows.length === 0 ? (
          <p className="text-xs text-muted-foreground">{props.emptyLabel ?? "No suggestions yet."}</p>
        ) : (
          <ul className="space-y-2">
            {rows.map((r) => (
              <li key={r.id} className="rounded-md border p-2 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-xs font-medium truncate">{r.title}</div>
                    {r.summary && (
                      <div className="text-[11px] text-muted-foreground line-clamp-3">{r.summary}</div>
                    )}
                  </div>
                  <StatusBadge status={r.status} />
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <ConfidenceIndicator value={r.confidence != null ? Number(r.confidence) : null} />
                  {r.severity && <Badge variant="outline" className="text-[10px] capitalize">{r.severity}</Badge>}
                  {r.kind && <Badge variant="outline" className="text-[10px]">{r.kind}</Badge>}
                </div>
                {r.status === "suggested" && (
                  <div className="flex gap-1 pt-1">
                    <Button size="sm" variant="default" className="h-6 text-[10px]"
                      onClick={() => setStatus.mutate({ id: r.id, status: "accepted" })}>
                      <Check className="h-3 w-3 mr-1" /> Accept
                    </Button>
                    <Button size="sm" variant="outline" className="h-6 text-[10px]"
                      onClick={() => setStatus.mutate({ id: r.id, status: "rejected" })}>
                      <X className="h-3 w-3 mr-1" /> Reject
                    </Button>
                    <Button size="sm" variant="ghost" className="h-6 text-[10px]"
                      onClick={() => setStatus.mutate({ id: r.id, status: "archived" })}>
                      Archive
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    suggested: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
    accepted: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
    rejected: "bg-rose-500/15 text-rose-700 dark:text-rose-400",
    archived: "bg-muted text-muted-foreground",
    draft: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${map[status] ?? "bg-muted"}`}>
      {status}
    </span>
  );
}

// Kind-specific wrappers -----------------------------------------------------
export function DiagnosisSuggestionPanel(props: {
  tenantId: string | null;
  encounterId?: string | null;
  patientId?: string | null;
}) {
  return (
    <RecommendationPanel {...props} kind="differential" title="Differential Diagnoses" />
  );
}
export function TreatmentSuggestionPanel(props: {
  tenantId: string | null;
  encounterId?: string | null;
  patientId?: string | null;
}) {
  return <RecommendationPanel {...props} kind="treatment" title="Treatment Suggestions" />;
}
export function ClinicalChecklistPanel(props: {
  tenantId: string | null;
  encounterId?: string | null;
  patientId?: string | null;
}) {
  return <RecommendationPanel {...props} kind="checklist" title="Clinical Checklist" />;
}

// ---------------------------------------------------------------------------
// AI Conversation panel — per-encounter log
// ---------------------------------------------------------------------------
export function AIConversationPanel(props: {
  tenantId: string | null;
  encounterId?: string | null;
  patientId?: string | null;
}) {
  const fn = useServerFn(listAiConversations);
  const q = useQuery({
    queryKey: ["ai-conversations", props.tenantId, props.encounterId ?? null, props.patientId ?? null],
    queryFn: () =>
      fn({
        data: {
          tenantId: props.tenantId!,
          encounterId: props.encounterId ?? undefined,
          patientId: props.patientId ?? undefined,
        },
      }),
    enabled: Boolean(props.tenantId),
  });
  const rows = (q.data?.rows ?? []) as Conversation[];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <MessageSquareText className="h-3.5 w-3.5" /> AI Conversation Log
          <Badge variant="outline" className="ml-auto text-[10px]">{rows.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {q.isLoading ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-xs text-muted-foreground">No AI calls in this scope yet.</p>
        ) : (
          <ScrollArea className="max-h-80">
            <ul className="space-y-2 pr-2">
              {rows.map((c) => (
                <li key={c.id} className="rounded-md border p-2 space-y-1">
                  <div className="flex items-center gap-2 text-[11px]">
                    <Badge variant="outline" className="text-[10px]">{c.purpose}</Badge>
                    <span className="text-muted-foreground">{c.model}</span>
                    {c.latency_ms != null && (
                      <span className="text-muted-foreground">· {c.latency_ms}ms</span>
                    )}
                    {c.tokens_output != null && (
                      <span className="text-muted-foreground">· {c.tokens_output}t out</span>
                    )}
                    <span className="ml-auto text-muted-foreground">v{c.version}</span>
                  </div>
                  {c.response && (
                    <pre className="whitespace-pre-wrap text-[11px] leading-snug font-sans line-clamp-4">
                      {c.response}
                    </pre>
                  )}
                  {c.error && <div className="text-[11px] text-destructive">{c.error}</div>}
                  {c.feedback && (
                    <div className="text-[10px] text-muted-foreground">
                      Feedback: {c.feedback}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Prompt inspector — browse tenant-inheritable prompt templates
// ---------------------------------------------------------------------------
export function PromptInspector({ tenantId }: { tenantId: string | null }) {
  const fn = useServerFn(listAiPromptTemplates);
  const q = useQuery({
    queryKey: ["ai-prompt-templates", tenantId],
    queryFn: () => fn({ data: { tenantId: tenantId! } }),
    enabled: Boolean(tenantId),
  });
  const rows = (q.data?.rows ?? []) as PromptTemplate[];
  const [openId, setOpenId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const filtered = useMemo(
    () => (filter === "all" ? rows : rows.filter((r) => r.purpose === filter)),
    [rows, filter],
  );
  const purposes = useMemo(
    () => Array.from(new Set(rows.map((r) => r.purpose))).sort(),
    [rows],
  );
  const active = rows.find((r) => r.id === openId) ?? null;

  return (
    <Card>
      <CardHeader className="pb-2 flex-row items-center gap-2">
        <CardTitle className="text-sm flex items-center gap-1.5">
          <BookOpen className="h-3.5 w-3.5" /> Prompt Inspector
        </CardTitle>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="ml-auto h-7 w-40 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All purposes</SelectItem>
            {purposes.map((p) => (
              <SelectItem key={p} value={p}>{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {q.isLoading ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : (
          <ul className="divide-y">
            {filtered.map((r) => (
              <li key={r.id} className="py-1.5 flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium truncate">{r.name}</div>
                  <div className="text-[10px] text-muted-foreground truncate">
                    {r.code} · v{r.version} · {r.purpose} · {r.tenant_id ? "tenant" : "global"}
                  </div>
                </div>
                <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => setOpenId(r.id)}>
                  View
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
      <Dialog open={active != null} onOpenChange={(o) => !o && setOpenId(null)}>
        {active && (
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{active.name}</DialogTitle>
              <DialogDescription>
                {active.code} · v{active.version} · {active.purpose} · model: {active.model_hint ?? "default"}
              </DialogDescription>
            </DialogHeader>
            <pre className="whitespace-pre-wrap text-xs leading-snug bg-muted rounded-md p-3 max-h-96 overflow-auto">
              {active.prompt}
            </pre>
          </DialogContent>
        )}
      </Dialog>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Composite: right-column drop-in for the workspace shell.
// ---------------------------------------------------------------------------
export function AssistantRightRail({ ctx }: { ctx: ClinicalContextData | undefined }): ReactNode {
  return (
    <div className="space-y-3">
      <ClinicalAssistantPanel ctx={ctx} />
    </div>
  );
}

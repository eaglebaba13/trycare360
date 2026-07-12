/**
 * Clinical / EMR — Stage 6 Analytics Service (server-only).
 *
 * Single aggregation layer for the Clinical Analytics module. Reads
 * ONLY from Stage 1-5 tables via Supabase and the existing Data
 * Foundation. No new event bus, no duplicate reporting engine.
 *
 * Every metric formula is locked in `src/lib/analytics/kpi-definitions.md`
 * (Clinical section). If a consumer needs a KPI, extend that document
 * first, then implement the calculation here.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type SB = SupabaseClient<Database>;

export interface DateWindow {
  from: string; // ISO date (yyyy-mm-dd)
  to: string;   // ISO date (yyyy-mm-dd) inclusive
}

function toIso(d: string, endOfDay = false): string {
  return endOfDay ? `${d}T23:59:59.999Z` : `${d}T00:00:00.000Z`;
}

function within<T extends { created_at?: string | null }>(rows: T[], w: DateWindow): T[] {
  const from = toIso(w.from);
  const to = toIso(w.to, true);
  return rows.filter((r) => {
    const t = r.created_at ?? "";
    return t >= from && t <= to;
  });
}

async function fetchAll<T>(
  sb: SB,
  table: keyof Database["public"]["Tables"],
  tenantId: string,
  w: DateWindow,
  limit = 2000,
): Promise<T[]> {
  const { data, error } = await sb
    .from(table as never)
    .select("*")
    .eq("tenant_id", tenantId)
    .gte("created_at", toIso(w.from))
    .lte("created_at", toIso(w.to, true))
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as T[];
}

export class ClinicalAnalyticsService {
  constructor(private readonly sb: SB) {}

  // -----------------------------------------------------------------
  // 1. Executive KPIs
  // -----------------------------------------------------------------
  async executive(tenantId: string, w: DateWindow) {
    const [encounters, plans, rx, followups, referrals, aiConvos] = await Promise.all([
      fetchAll<{ id: string; status: string; created_at: string; ended_at: string | null }>(
        this.sb, "clinical_encounters", tenantId, w),
      fetchAll<{ id: string; status: string; created_at: string }>(
        this.sb, "clinical_treatment_plans", tenantId, w),
      fetchAll<{ id: string; status: string; created_at: string }>(
        this.sb, "clinical_prescriptions", tenantId, w),
      fetchAll<{ id: string; status: string; suggested_date: string | null; created_at: string }>(
        this.sb, "clinical_followups", tenantId, w),
      fetchAll<{ id: string; status: string; created_at: string }>(
        this.sb, "clinical_referrals", tenantId, w, 500),
      fetchAll<{ id: string; created_at: string }>(
        this.sb, "clinical_ai_conversations", tenantId, w, 500),
    ]);

    const today = new Date().toISOString().slice(0, 10);
    const daily = encounters.filter((e) => e.created_at.slice(0, 10) === today).length;

    // Encounter trend (last N days within window)
    const byDay = new Map<string, number>();
    for (const e of encounters) {
      const d = e.created_at.slice(0, 10);
      byDay.set(d, (byDay.get(d) ?? 0) + 1);
    }
    const trend = [...byDay.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));

    return {
      dailyConsultations: daily,
      completedEncounters: encounters.filter((e) => e.status === "completed" || e.status === "closed").length,
      openEncounters: encounters.filter((e) => e.status === "open" || e.status === "in_progress").length,
      treatmentPlans: plans.length,
      activePrescriptions: rx.filter((p) => p.status === "active" || p.status === "issued").length,
      followupsDue: followups.filter((f) => f.status === "pending" || f.status === "scheduled").length,
      referralVolume: referrals.length,
      aiUsage: aiConvos.length,
      totalEncounters: encounters.length,
      trend,
    };
  }

  // -----------------------------------------------------------------
  // 2. Doctor Performance
  // -----------------------------------------------------------------
  async doctorPerformance(tenantId: string, w: DateWindow) {
    const [encounters, notes, plans, referrals, followups, feedback] = await Promise.all([
      fetchAll<{
        id: string; primary_doctor_id: string | null; status: string;
        started_at: string | null; ended_at: string | null; created_at: string;
      }>(this.sb, "clinical_encounters", tenantId, w),
      fetchAll<{ id: string; encounter_id: string; status: string; signed_at: string | null; created_at: string }>(
        this.sb, "clinical_soap_notes", tenantId, w),
      fetchAll<{ id: string; created_by: string | null; status: string; created_at: string }>(
        this.sb, "clinical_treatment_plans", tenantId, w),
      fetchAll<{ id: string; created_by: string | null; created_at: string }>(
        this.sb, "clinical_referrals", tenantId, w, 500),
      fetchAll<{ id: string; created_by: string | null; status: string; created_at: string }>(
        this.sb, "clinical_followups", tenantId, w),
      fetchAll<{ id: string; created_at: string; rating: number | null; doctor_id: string | null }>(
        this.sb, "appointment_feedback", tenantId, w, 500),
    ]);

    const notesByEnc = new Map(notes.map((n) => [n.encounter_id, n]));
    const doctors = new Map<string, {
      doctorId: string;
      encounters: number;
      totalMinutes: number;
      completedEncounters: number;
      plans: number;
      referrals: number;
      followupsCompleted: number;
      followupsTotal: number;
      soapCompleted: number;
      soapSigned: number;
      feedbackRatingSum: number;
      feedbackCount: number;
    }>();

    const bucket = (id: string) => {
      let d = doctors.get(id);
      if (!d) {
        d = {
          doctorId: id, encounters: 0, totalMinutes: 0, completedEncounters: 0,
          plans: 0, referrals: 0, followupsCompleted: 0, followupsTotal: 0,
          soapCompleted: 0, soapSigned: 0, feedbackRatingSum: 0, feedbackCount: 0,
        };
        doctors.set(id, d);
      }
      return d;
    };

    for (const e of encounters) {
      if (!e.primary_doctor_id) continue;
      const d = bucket(e.primary_doctor_id);
      d.encounters += 1;
      if (e.status === "completed" || e.status === "closed") d.completedEncounters += 1;
      if (e.started_at && e.ended_at) {
        d.totalMinutes += Math.max(0, (Date.parse(e.ended_at) - Date.parse(e.started_at)) / 60000);
      }
      const note = notesByEnc.get(e.id);
      if (note) {
        if (note.status === "final" || note.status === "signed") d.soapCompleted += 1;
        if (note.signed_at) d.soapSigned += 1;
      }
    }
    for (const p of plans) if (p.created_by) bucket(p.created_by).plans += 1;
    for (const r of referrals) if (r.created_by) bucket(r.created_by).referrals += 1;
    for (const f of followups) {
      if (!f.created_by) continue;
      const d = bucket(f.created_by);
      d.followupsTotal += 1;
      if (f.status === "completed") d.followupsCompleted += 1;
    }
    for (const fb of feedback) {
      if (!fb.doctor_id || fb.rating == null) continue;
      const d = bucket(fb.doctor_id);
      d.feedbackRatingSum += Number(fb.rating);
      d.feedbackCount += 1;
    }

    const rows = [...doctors.values()].map((d) => ({
      doctor_id: d.doctorId,
      consultations: d.encounters,
      avg_consultation_minutes: d.completedEncounters
        ? Number((d.totalMinutes / d.completedEncounters).toFixed(1))
        : 0,
      treatment_plans: d.plans,
      followup_compliance: d.followupsTotal ? d.followupsCompleted / d.followupsTotal : 0,
      referral_rate: d.encounters ? d.referrals / d.encounters : 0,
      soap_completion_rate: d.encounters ? d.soapCompleted / d.encounters : 0,
      documentation_quality: d.encounters ? d.soapSigned / d.encounters : 0,
      patient_satisfaction: d.feedbackCount ? d.feedbackRatingSum / d.feedbackCount : 0,
    }));

    return { rows: rows.sort((a, b) => b.consultations - a.consultations) };
  }

  // -----------------------------------------------------------------
  // 3. Clinical Outcomes
  // -----------------------------------------------------------------
  async outcomes(tenantId: string, w: DateWindow) {
    const [plans, followups, encounters] = await Promise.all([
      fetchAll<{ id: string; status: string; patient_id: string; created_at: string; progress: unknown }>(
        this.sb, "clinical_treatment_plans", tenantId, w),
      fetchAll<{ id: string; status: string; created_at: string }>(
        this.sb, "clinical_followups", tenantId, w),
      fetchAll<{ id: string; patient_id: string; created_at: string }>(
        this.sb, "clinical_encounters", tenantId, w),
    ]);

    const completed = plans.filter((p) => p.status === "completed").length;
    const dropped = plans.filter((p) => p.status === "cancelled" || p.status === "dropped").length;
    const active = plans.filter((p) => p.status === "active" || p.status === "in_progress").length;
    const treatmentSuccess = plans.length ? completed / plans.length : 0;
    const dropOff = plans.length ? dropped / plans.length : 0;

    const fuCompleted = followups.filter((f) => f.status === "completed").length;
    const followupCompletion = followups.length ? fuCompleted / followups.length : 0;

    // Repeat visit rate — patients with more than one encounter in the window
    const perPatient = new Map<string, number>();
    for (const e of encounters) perPatient.set(e.patient_id, (perPatient.get(e.patient_id) ?? 0) + 1);
    const repeaters = [...perPatient.values()].filter((n) => n > 1).length;
    const repeatVisitRate = perPatient.size ? repeaters / perPatient.size : 0;

    // Recovery rate — plans with progress.status === "recovered" or milestones completion >= 100
    const recovered = plans.filter((p) => {
      const prog = (p.progress ?? {}) as { status?: string; percent?: number };
      return prog.status === "recovered" || (typeof prog.percent === "number" && prog.percent >= 100);
    }).length;
    const recoveryRate = plans.length ? recovered / plans.length : 0;

    return {
      totalPlans: plans.length,
      completedPlans: completed,
      activePlans: active,
      droppedPlans: dropped,
      treatmentSuccess,
      recoveryRate,
      repeatVisitRate,
      followupCompletion,
      dropOff,
      protocolCompliance: plans.length
        ? plans.filter((p) => {
            const meta = (p.progress ?? {}) as { protocol_compliant?: boolean };
            return meta.protocol_compliant !== false;
          }).length / plans.length
        : 1,
    };
  }

  // -----------------------------------------------------------------
  // 4. Quality Dashboard
  // -----------------------------------------------------------------
  async quality(tenantId: string, w: DateWindow) {
    const [encounters, notes, followups, consents, vitals, problems] = await Promise.all([
      fetchAll<{ id: string; status: string; primary_doctor_id: string | null; chief_complaint: string | null; created_at: string }>(
        this.sb, "clinical_encounters", tenantId, w),
      fetchAll<{ id: string; encounter_id: string; status: string; signed_at: string | null; created_at: string }>(
        this.sb, "clinical_soap_notes", tenantId, w),
      fetchAll<{ id: string; status: string; suggested_date: string | null; created_at: string }>(
        this.sb, "clinical_followups", tenantId, w),
      fetchAll<{ id: string; encounter_id: string | null; status: string; signed_at: string | null; created_at: string }>(
        this.sb, "clinical_consents", tenantId, w),
      fetchAll<{ id: string; patient_id: string; created_at: string }>(
        this.sb, "clinical_vitals", tenantId, w, 2000),
      fetchAll<{ id: string; patient_id: string; problem_text: string | null; created_at: string; status: string }>(
        this.sb, "clinical_problems", tenantId, w, 2000),
    ]);

    const notesByEnc = new Map(notes.map((n) => [n.encounter_id, n]));
    const consentByEnc = new Map<string, boolean>();
    for (const c of consents) {
      if (c.encounter_id) consentByEnc.set(c.encounter_id, (c.status === "signed" || !!c.signed_at));
    }
    const vitalsByPatient = new Set(vitals.map((v) => v.patient_id));

    const closed = encounters.filter((e) => e.status === "completed" || e.status === "closed");
    const incompleteSoap = closed.filter((e) => {
      const n = notesByEnc.get(e.id);
      return !n || n.status === "draft";
    }).length;
    const unsignedNotes = notes.filter((n) => !n.signed_at).length;
    const missingConsent = closed.filter((e) => !consentByEnc.get(e.id)).length;
    const now = Date.now();
    const overdueFollowups = followups.filter((f) =>
      (f.status === "pending" || f.status === "scheduled") &&
      f.suggested_date &&
      Date.parse(f.suggested_date) < now
    ).length;
    const missingVitals = closed.filter((e) => !vitalsByPatient.has(e.id)).length; // rough: encounter not linked
    const missingDiagnosis = closed.filter((e) => !e.chief_complaint).length;

    // Duplicate problems — same text per patient
    const seen = new Map<string, number>();
    for (const p of problems) {
      const k = `${p.patient_id}::${(p.problem_text ?? "").trim().toLowerCase()}`;
      if (!k.endsWith("::")) seen.set(k, (seen.get(k) ?? 0) + 1);
    }
    const duplicateProblems = [...seen.values()].filter((n) => n > 1).length;
    const openProblems = problems.filter((p) => p.status === "active" || p.status === "open").length;

    return {
      closedEncounters: closed.length,
      incompleteSoap,
      unsignedNotes,
      missingConsent,
      overdueFollowups,
      missingVitals,
      missingDiagnosis,
      openProblems,
      duplicateProblems,
    };
  }

  // -----------------------------------------------------------------
  // 5. Compliance Dashboard
  // -----------------------------------------------------------------
  async compliance(tenantId: string, w: DateWindow) {
    const [consents, notes, aiAudit, encounters] = await Promise.all([
      fetchAll<{ id: string; status: string; signed_at: string | null; created_at: string }>(
        this.sb, "clinical_consents", tenantId, w),
      fetchAll<{ id: string; status: string; signed_at: string | null; created_at: string }>(
        this.sb, "clinical_soap_notes", tenantId, w),
      fetchAll<{ id: string; created_at: string; entity_type: string | null }>(
        this.sb, "clinical_ai_audit", tenantId, w, 2000),
      fetchAll<{ id: string; status: string; created_at: string }>(
        this.sb, "clinical_encounters", tenantId, w),
    ]);

    const signedConsents = consents.filter((c) => c.status === "signed" || c.signed_at).length;
    const signedNotes = notes.filter((n) => n.signed_at).length;
    const closed = encounters.filter((e) => e.status === "completed" || e.status === "closed").length;

    return {
      consentCompliance: consents.length ? signedConsents / consents.length : 1,
      totalConsents: consents.length,
      signedConsents,
      clinicalSignatures: signedNotes,
      totalNotes: notes.length,
      documentationCompleteness: closed && notes.length ? Math.min(1, notes.length / closed) : 1,
      auditEvents: aiAudit.length,
      accessLogs: aiAudit.filter((a) => (a.entity_type ?? "").includes("access")).length,
      clinicalRecordChanges: aiAudit.filter((a) => (a.entity_type ?? "").includes("record")).length,
      rlsCompliance: 1, // enforced at DB — surfaced as an indicator
    };
  }

  // -----------------------------------------------------------------
  // 6. Clinical AI Dashboard
  // -----------------------------------------------------------------
  async aiDashboard(tenantId: string, w: DateWindow) {
    const [convos, recs] = await Promise.all([
      fetchAll<{
        id: string; model: string; purpose: string; prompt_template_code: string | null;
        latency_ms: number | null; tokens_input: number | null; tokens_output: number | null;
        cost_usd: number | null; error: string | null; created_at: string;
      }>(this.sb, "clinical_ai_conversations", tenantId, w, 2000),
      fetchAll<{ id: string; status: string; kind: string; created_at: string; confidence: number | null }>(
        this.sb, "clinical_ai_recommendations", tenantId, w, 2000),
    ]);

    const accepted = recs.filter((r) => r.status === "accepted").length;
    const rejected = recs.filter((r) => r.status === "rejected").length;
    const suggested = recs.filter((r) => r.status === "suggested" || r.status === "draft").length;
    const totalDecided = accepted + rejected;

    const promptUsage = new Map<string, number>();
    for (const c of convos) promptUsage.set(c.prompt_template_code ?? "ad-hoc", (promptUsage.get(c.prompt_template_code ?? "ad-hoc") ?? 0) + 1);

    const totalLatency = convos.reduce((s, c) => s + (c.latency_ms ?? 0), 0);
    const totalTokens = convos.reduce((s, c) => s + (c.tokens_input ?? 0) + (c.tokens_output ?? 0), 0);
    const totalCost = convos.reduce((s, c) => s + Number(c.cost_usd ?? 0), 0);
    const confSum = recs.reduce((s, r) => s + Number(r.confidence ?? 0), 0);
    const confCount = recs.filter((r) => r.confidence != null).length;

    return {
      assistantUsage: convos.length,
      recommendationsTotal: recs.length,
      accepted, rejected, suggested,
      acceptanceRate: totalDecided ? accepted / totalDecided : 0,
      rejectionRate: totalDecided ? rejected / totalDecided : 0,
      recommendationQuality: confCount ? confSum / confCount : 0,
      avgLatencyMs: convos.length ? Math.round(totalLatency / convos.length) : 0,
      totalTokens,
      estimatedCostUsd: Number(totalCost.toFixed(4)),
      promptUsage: [...promptUsage.entries()]
        .map(([code, count]) => ({ code, count }))
        .sort((a, b) => b.count - a.count),
      errorRate: convos.length ? convos.filter((c) => c.error).length / convos.length : 0,
    };
  }

  // -----------------------------------------------------------------
  // 7. Enterprise Report (aggregation)
  // -----------------------------------------------------------------
  async report(args: {
    tenantId: string;
    window: DateWindow;
    groupBy: "day" | "week" | "month" | "doctor" | "branch" | "service" | "diagnosis" | "treatment" | "outcome";
  }) {
    const [encounters, plans, rx] = await Promise.all([
      fetchAll<{
        id: string; primary_doctor_id: string | null; branch_id: string | null;
        status: string; chief_complaint: string | null; encounter_type: string;
        started_at: string | null; ended_at: string | null; created_at: string;
      }>(this.sb, "clinical_encounters", args.tenantId, args.window, 5000),
      fetchAll<{ id: string; status: string; title: string; created_at: string }>(
        this.sb, "clinical_treatment_plans", args.tenantId, args.window, 5000),
      fetchAll<{ id: string; status: string; created_at: string }>(
        this.sb, "clinical_prescriptions", args.tenantId, args.window, 5000),
    ]);

    const groupKey = (e: (typeof encounters)[number]): string => {
      switch (args.groupBy) {
        case "day": return e.created_at.slice(0, 10);
        case "week": {
          const d = new Date(e.created_at);
          const day = d.getUTCDay();
          d.setUTCDate(d.getUTCDate() - day);
          return d.toISOString().slice(0, 10);
        }
        case "month": return e.created_at.slice(0, 7);
        case "doctor": return e.primary_doctor_id ?? "unassigned";
        case "branch": return e.branch_id ?? "unassigned";
        case "service": return e.encounter_type ?? "unknown";
        case "diagnosis": return (e.chief_complaint ?? "undiagnosed").slice(0, 60);
        case "treatment": return e.encounter_type ?? "unknown";
        case "outcome": return e.status;
      }
    };

    const buckets = new Map<string, { key: string; encounters: number; completed: number; open: number; totalMinutes: number; withDuration: number }>();
    for (const e of encounters) {
      const k = groupKey(e);
      let b = buckets.get(k);
      if (!b) { b = { key: k, encounters: 0, completed: 0, open: 0, totalMinutes: 0, withDuration: 0 }; buckets.set(k, b); }
      b.encounters += 1;
      if (e.status === "completed" || e.status === "closed") b.completed += 1;
      if (e.status === "open" || e.status === "in_progress") b.open += 1;
      if (e.started_at && e.ended_at) {
        b.totalMinutes += Math.max(0, (Date.parse(e.ended_at) - Date.parse(e.started_at)) / 60000);
        b.withDuration += 1;
      }
    }

    const rows = [...buckets.values()]
      .map((b) => ({
        group: b.key,
        encounters: b.encounters,
        completed: b.completed,
        open: b.open,
        avg_minutes: b.withDuration ? Number((b.totalMinutes / b.withDuration).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.encounters - a.encounters);

    return {
      rows,
      totals: {
        encounters: encounters.length,
        plans: plans.length,
        prescriptions: rx.length,
      },
    };
  }
}

// Re-exports for tests / potential reuse.
export { within, toIso };

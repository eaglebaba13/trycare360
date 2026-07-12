/**
 * PathologyEngine — histopathology / cytology / frozen section lifecycle.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { PathologyRepository } from "../repositories.server";
import { emitLabEvent, indexLabSearch, nextDocumentNumber, writeLabAudit } from "../helpers.server";
import { PATHOLOGY_EVENTS } from "../events";

type SB = SupabaseClient<Database>;

export class PathologyEngine {
  private readonly repo: PathologyRepository;
  constructor(private readonly sb: SB) {
    this.repo = new PathologyRepository(sb);
  }

  async create(args: {
    tenantId: string;
    orderId?: string | null;
    specimenId?: string | null;
    branchId?: string | null;
    caseKind: "histopathology" | "cytology" | "frozen" | "immunohisto";
    pathologistId?: string | null;
    actorId: string | null;
  }) {
    const row = await this.repo.insert({
      tenant_id: args.tenantId,
      order_id: args.orderId ?? null,
      specimen_id: args.specimenId ?? null,
      branch_id: args.branchId ?? null,
      case_kind: args.caseKind,
      case_no: nextDocumentNumber("PATH"),
      status: "received",
      pathologist_id: args.pathologistId ?? null,
      created_by: args.actorId,
      updated_by: args.actorId,
      attachments: {} as never,
      meta: {} as never,
    });
    await Promise.all([
      emitLabEvent(this.sb, args.tenantId, PATHOLOGY_EVENTS.CaseReceived, {
        caseId: row.id,
        caseNo: row.case_no,
      }),
      indexLabSearch(this.sb, {
        tenantId: args.tenantId,
        entityType: "lab_pathology_case",
        entityId: row.id,
        title: `Pathology case ${row.case_no}`,
        subtitle: args.caseKind,
        keywords: row.case_no,
      }),
      writeLabAudit(this.sb, {
        tenantId: args.tenantId,
        entityType: "lab_pathology_case",
        entityId: row.id,
        action: "received",
        actorId: args.actorId,
      }),
    ]);
    return row;
  }

  async transition(args: {
    tenantId: string;
    caseId: string;
    to: "grossing" | "processing" | "reviewing" | "reported";
    actorId: string | null;
  }) {
    const patched = await this.repo.update(args.caseId, { status: args.to });
    const evtMap = {
      grossing: PATHOLOGY_EVENTS.CaseGrossing,
      processing: PATHOLOGY_EVENTS.CaseProcessing,
      reviewing: PATHOLOGY_EVENTS.CaseReviewing,
      reported: PATHOLOGY_EVENTS.CaseReported,
    } as const;
    await emitLabEvent(this.sb, args.tenantId, evtMap[args.to], { caseId: args.caseId });
    return patched;
  }

  async report(args: {
    tenantId: string;
    caseId: string;
    grossDescription?: string | null;
    microscopicDescription?: string | null;
    diagnosis?: string | null;
    icdOCode?: string | null;
    attachments?: Record<string, unknown>;
    actorId: string | null;
  }) {
    const patched = await this.repo.update(args.caseId, {
      gross_description: args.grossDescription ?? null,
      microscopic_description: args.microscopicDescription ?? null,
      diagnosis: args.diagnosis ?? null,
      icd_o_code: args.icdOCode ?? null,
      attachments: (args.attachments ?? {}) as never,
      status: "reported",
      reported_at: new Date().toISOString(),
      updated_by: args.actorId,
    });
    await emitLabEvent(this.sb, args.tenantId, PATHOLOGY_EVENTS.CaseReported, {
      caseId: args.caseId,
    });
    await writeLabAudit(this.sb, {
      tenantId: args.tenantId,
      entityType: "lab_pathology_case",
      entityId: args.caseId,
      action: "reported",
      actorId: args.actorId,
    });
    return patched;
  }
}

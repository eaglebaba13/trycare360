import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  PatientDocumentFolderRepository,
  PatientDocumentRepository,
  SavedPrescriptionRepository,
  SavedReportRepository,
} from "../repositories.server";
import {
  assertFamilyPermission,
  emitPatientEvent,
  indexPatientSearch,
  resolvePatientIdentity,
} from "../helpers.server";
import { PATIENT_EVENTS } from "../events";

// biome-ignore lint/suspicious/noExplicitAny: escape from deep generics
type SB = SupabaseClient<Database> | any;

/**
 * Documents engine — patient-visible document folders, saved reports
 * and saved prescriptions. Storage buckets and signed URLs are
 * delegated to Supabase Storage; this engine never writes raw storage
 * paths to any client payload. Reuses the platform Data Foundation
 * Documents contract.
 */
export class DocumentsEngine {
  constructor(private readonly sb: SB) {}

  async list(viewerUserId: string, args: { targetUserId?: string; folderId?: string | null; limit?: number }) {
    const targetUserId = args.targetUserId ?? viewerUserId;
    if (viewerUserId !== targetUserId) {
      await assertFamilyPermission(this.sb, { viewerUserId, targetUserId, capability: "view" });
    }
    return new PatientDocumentRepository(this.sb).list(targetUserId, {
      folderId: args.folderId,
      limit: args.limit,
    });
  }

  async listFolders(userId: string) {
    return new PatientDocumentFolderRepository(this.sb).list(userId);
  }

  async createFolder(userId: string, input: { name: string; parentId?: string | null; color?: string | null; icon?: string | null }) {
    return new PatientDocumentFolderRepository(this.sb).insert({
      patient_user_id: userId,
      name: input.name,
      parent_id: input.parentId ?? null,
      color: input.color ?? null,
      icon: input.icon ?? null,
    });
  }

  async saveReport(userId: string, input: { reportType: string; referenceId: string; title: string; meta?: Record<string, unknown> }) {
    const identity = await resolvePatientIdentity(this.sb, userId);
    const row = await new SavedReportRepository(this.sb).insert({
      patient_user_id: userId,
      report_type: input.reportType,
      reference_id: input.referenceId,
      title: input.title,
      meta: (input.meta ?? {}) as never,
    });
    await emitPatientEvent(this.sb, {
      tenantId: identity.tenantId,
      event: PATIENT_EVENTS.DocumentUploaded,
      payload: { saved_report_id: row.id, reference_id: input.referenceId },
    });
    await indexPatientSearch(this.sb, {
      tenantId: identity.tenantId,
      entityType: "patient_document",
      entityId: row.id,
      title: input.title,
      subtitle: input.reportType,
    });
    return row;
  }

  async savePrescription(userId: string, input: { prescriptionId: string; notes?: string | null; meta?: Record<string, unknown> }) {
    return new SavedPrescriptionRepository(this.sb).insert({
      patient_user_id: userId,
      prescription_id: input.prescriptionId,
      notes: input.notes ?? null,
      meta: (input.meta ?? {}) as never,
    });
  }

  async getSignedUrl(viewerUserId: string, input: { documentId: string; expiresIn?: number }) {
    const repo = new PatientDocumentRepository(this.sb);
    const doc = await repo.getById(input.documentId);
    if (!doc) throw new Error("Document not found");
    if (doc.patient_user_id !== viewerUserId) {
      await assertFamilyPermission(this.sb, {
        viewerUserId,
        targetUserId: doc.patient_user_id,
        capability: "view",
      });
    }
    if (!doc.storage_path) throw new Error("Document has no storage path");
    const [bucket, ...rest] = doc.storage_path.split("/");
    const path = rest.join("/");
    const { data, error } = await this.sb.storage.from(bucket).createSignedUrl(path, input.expiresIn ?? 300);
    if (error) throw new Error(error.message);
    return { url: data?.signedUrl ?? null, expiresIn: input.expiresIn ?? 300 };
  }
}

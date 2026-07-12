/**
 * RadiologyEngine + ImagingMetadataEngine — radiology order, study
 * acquisition, DICOM metadata capture, report drafting and release.
 * PACS/RIS integration is delegated to the Integration Dispatcher.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { ImagingRepository, RadiologyRepository } from "../repositories.server";
import {
  emitLabEvent,
  indexLabSearch,
  logLabTimeline,
  nextDocumentNumber,
  writeLabAudit,
} from "../helpers.server";
import { RADIOLOGY_EVENTS } from "../events";

type SB = SupabaseClient<Database>;

export class RadiologyEngine {
  private readonly repo: RadiologyRepository;
  private readonly imaging: ImagingRepository;
  constructor(private readonly sb: SB) {
    this.repo = new RadiologyRepository(sb);
    this.imaging = new ImagingRepository(sb);
  }

  async order(args: {
    tenantId: string;
    branchId?: string | null;
    personId?: string | null;
    patientId?: string | null;
    encounterId?: string | null;
    orderingProviderId?: string | null;
    modalityId?: string | null;
    bodyPartId?: string | null;
    laterality?: "left" | "right" | "bilateral" | "na" | null;
    priority: "routine" | "urgent" | "stat";
    clinicalHistory?: string | null;
    scheduledAt?: string | null;
    invoiceId?: string | null;
    authorizationId?: string | null;
    actorId: string | null;
  }) {
    const row = await this.repo.insertOrder({
      tenant_id: args.tenantId,
      branch_id: args.branchId ?? null,
      person_id: args.personId ?? null,
      patient_id: args.patientId ?? null,
      encounter_id: args.encounterId ?? null,
      ordering_provider_id: args.orderingProviderId ?? null,
      modality_id: args.modalityId ?? null,
      body_part_id: args.bodyPartId ?? null,
      laterality: args.laterality ?? null,
      priority: args.priority,
      clinical_history: args.clinicalHistory ?? null,
      scheduled_at: args.scheduledAt ?? null,
      order_no: nextDocumentNumber("RAD"),
      ordered_at: new Date().toISOString(),
      status: args.scheduledAt ? "scheduled" : "placed",
      diagnosis_codes: [] as never,
      invoice_id: args.invoiceId ?? null,
      authorization_id: args.authorizationId ?? null,
      created_by: args.actorId,
      updated_by: args.actorId,
      meta: {} as never,
    });
    await Promise.all([
      emitLabEvent(this.sb, args.tenantId, RADIOLOGY_EVENTS.OrderPlaced, {
        radOrderId: row.id,
        orderNo: row.order_no,
      }),
      indexLabSearch(this.sb, {
        tenantId: args.tenantId,
        entityType: "rad_order",
        entityId: row.id,
        title: `Rad order ${row.order_no}`,
        keywords: row.order_no,
      }),
      args.personId
        ? logLabTimeline(this.sb, {
            tenantId: args.tenantId,
            entityType: "person",
            entityId: args.personId,
            eventType: RADIOLOGY_EVENTS.OrderPlaced,
            title: `Radiology order ${row.order_no} placed`,
            meta: { radOrderId: row.id },
          })
        : Promise.resolve(),
      writeLabAudit(this.sb, {
        tenantId: args.tenantId,
        entityType: "rad_order",
        entityId: row.id,
        action: "placed",
        actorId: args.actorId,
      }),
    ]);
    return row;
  }

  async schedule(tenantId: string, id: string, scheduledAt: string) {
    const patched = await this.repo.updateOrder(id, {
      status: "scheduled",
      scheduled_at: scheduledAt,
    });
    await emitLabEvent(this.sb, tenantId, RADIOLOGY_EVENTS.OrderScheduled, {
      radOrderId: id,
      scheduledAt,
    });
    return patched;
  }

  async recordStudy(args: {
    tenantId: string;
    radOrderId: string;
    studyUid?: string | null;
    accessionNo?: string | null;
    modalityCode?: string | null;
    technologistId?: string | null;
    performedAt?: string | null;
    actorId: string | null;
  }) {
    const study = await this.imaging.insertStudy({
      tenant_id: args.tenantId,
      rad_order_id: args.radOrderId,
      study_uid: args.studyUid ?? null,
      accession_no: args.accessionNo ?? nextDocumentNumber("STUDY"),
      modality_code: args.modalityCode ?? null,
      technologist_id: args.technologistId ?? null,
      performed_at: args.performedAt ?? new Date().toISOString(),
      performed_by: args.actorId,
      status: "acquired",
      created_by: args.actorId,
      updated_by: args.actorId,
      attachments: {} as never,
      meta: {} as never,
    });
    await this.repo.updateOrder(args.radOrderId, { status: "acquired" });
    await emitLabEvent(this.sb, args.tenantId, RADIOLOGY_EVENTS.StudyAcquired, {
      studyId: study.id,
      radOrderId: args.radOrderId,
    });
    await writeLabAudit(this.sb, {
      tenantId: args.tenantId,
      entityType: "rad_study",
      entityId: study.id,
      action: "acquired",
      actorId: args.actorId,
    });
    return study;
  }

  async report(args: {
    tenantId: string;
    studyId: string;
    reportText: string;
    impression?: string | null;
    radiologistId?: string | null;
    attachments?: Record<string, unknown>;
    actorId: string | null;
  }) {
    const patched = await this.imaging.updateStudy(args.studyId, {
      report_text: args.reportText,
      impression: args.impression ?? null,
      radiologist_id: args.radiologistId ?? args.actorId,
      reported_at: new Date().toISOString(),
      status: "reported",
      attachments: (args.attachments ?? {}) as never,
      updated_by: args.actorId,
    });
    await emitLabEvent(this.sb, args.tenantId, RADIOLOGY_EVENTS.ReportReleased, {
      studyId: args.studyId,
    });
    await writeLabAudit(this.sb, {
      tenantId: args.tenantId,
      entityType: "rad_study",
      entityId: args.studyId,
      action: "reported",
      actorId: args.actorId,
    });
    return patched;
  }
}

// -----------------------------------------------------------------------
// ImagingMetadataEngine — DICOM series/instance metadata storage.
// -----------------------------------------------------------------------
export class ImagingMetadataEngine {
  private readonly imaging: ImagingRepository;
  constructor(private readonly sb: SB) {
    this.imaging = new ImagingRepository(sb);
  }
  async attach(args: {
    tenantId: string;
    studyId: string;
    seriesUid?: string | null;
    instanceUid?: string | null;
    sopClassUid?: string | null;
    rows?: number | null;
    cols?: number | null;
    frameCount?: number | null;
    storageUrl?: string | null;
  }) {
    return this.imaging.insertMetadata({
      tenant_id: args.tenantId,
      study_id: args.studyId,
      series_uid: args.seriesUid ?? null,
      instance_uid: args.instanceUid ?? null,
      sop_class_uid: args.sopClassUid ?? null,
      rows: args.rows ?? null,
      cols: args.cols ?? null,
      frame_count: args.frameCount ?? null,
      storage_url: args.storageUrl ?? null,
      meta: {} as never,
    });
  }
}

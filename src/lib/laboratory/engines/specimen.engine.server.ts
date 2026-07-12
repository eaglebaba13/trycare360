/**
 * SpecimenEngine, BarcodeEngine, AccessionEngine —
 * Specimen collection, chain of custody, barcode uniqueness, accessioning.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  AccessionRepository,
  BarcodeRepository,
  LaboratoryOrderRepository,
  SpecimenRepository,
  SpecimenTrackingRepository,
  type AccessionRow,
  type SpecimenRow,
} from "../repositories.server";
import {
  emitLabEvent,
  indexLabSearch,
  logLabTimeline,
  nextDocumentNumber,
  writeLabAudit,
} from "../helpers.server";
import { LAB_EVENTS } from "../events";
import type { SpecimenCollectInput } from "../validators";

type SB = SupabaseClient<Database>;

export class SpecimenEngine {
  private readonly specimens: SpecimenRepository;
  private readonly tracking: SpecimenTrackingRepository;
  private readonly orders: LaboratoryOrderRepository;

  constructor(private readonly sb: SB) {
    this.specimens = new SpecimenRepository(sb);
    this.tracking = new SpecimenTrackingRepository(sb);
    this.orders = new LaboratoryOrderRepository(sb);
  }

  async collect(input: SpecimenCollectInput, actorId: string | null): Promise<SpecimenRow> {
    const order = await this.orders.getById(input.orderId);
    if (!order || order.tenant_id !== input.tenantId) throw new Error("Order not found");
    if (order.status === "cancelled") throw new Error("Cannot collect for cancelled order");

    const specimen = await this.specimens.insert({
      tenant_id: input.tenantId,
      order_id: input.orderId,
      branch_id: input.branchId ?? order.branch_id,
      sample_type_id: input.sampleTypeId ?? null,
      specimen_no: nextDocumentNumber("SPC"),
      status: "collected",
      collection_site: input.collectionSite ?? null,
      volume_ml: input.volumeMl ?? null,
      collection_at: input.collectedAt ?? new Date().toISOString(),
      collected_by: input.collectedBy ?? actorId,
      chain_of_custody: [
        {
          at: new Date().toISOString(),
          event: "collected",
          actor: input.collectedBy ?? actorId,
        },
      ] as never,
      created_by: actorId,
      updated_by: actorId,
      meta: {} as never,
    });

    for (const c of input.containers) {
      await this.specimens.insertContainer({
        tenant_id: input.tenantId,
        specimen_id: specimen.id,
        container_type_id: c.containerTypeId ?? null,
        container_no: c.containerNo ?? null,
        volume_ml: c.volumeMl ?? null,
        status: "active",
        meta: {} as never,
      });
    }

    await this.tracking.insert({
      tenant_id: input.tenantId,
      specimen_id: specimen.id,
      event: "collected",
      actor_id: input.collectedBy ?? actorId,
      location: input.collectionSite ?? null,
      meta: {} as never,
    });

    await Promise.all([
      emitLabEvent(this.sb, input.tenantId, LAB_EVENTS.SpecimenCollected, {
        specimenId: specimen.id,
        orderId: input.orderId,
      }),
      order.person_id
        ? logLabTimeline(this.sb, {
            tenantId: input.tenantId,
            entityType: "person",
            entityId: order.person_id,
            eventType: LAB_EVENTS.SpecimenCollected,
            title: `Specimen ${specimen.specimen_no} collected`,
            meta: { orderId: order.id },
          })
        : Promise.resolve(),
      writeLabAudit(this.sb, {
        tenantId: input.tenantId,
        entityType: "lab_specimen",
        entityId: specimen.id,
        action: "collected",
        actorId,
      }),
    ]);

    return specimen;
  }

  async transit(args: {
    tenantId: string;
    specimenId: string;
    event: "received" | "in_transit" | "stored" | "rejected" | "disposed";
    location?: string | null;
    temperatureC?: number | null;
    meta?: Record<string, unknown>;
    actorId: string | null;
  }): Promise<SpecimenRow> {
    const spec = await this.specimens.getById(args.specimenId);
    if (!spec || spec.tenant_id !== args.tenantId) throw new Error("Specimen not found");
    await this.tracking.insert({
      tenant_id: args.tenantId,
      specimen_id: args.specimenId,
      event: args.event,
      actor_id: args.actorId,
      location: args.location ?? null,
      temperature_c: args.temperatureC ?? null,
      meta: (args.meta ?? {}) as never,
    });
    const nextStatus =
      args.event === "received"
        ? "received"
        : args.event === "rejected"
          ? "rejected"
          : args.event === "disposed"
            ? "disposed"
            : args.event === "stored"
              ? "stored"
              : spec.status;
    const updated = await this.specimens.update(args.specimenId, {
      status: nextStatus,
      storage_location: args.location ?? spec.storage_location,
      chain_of_custody: [
        ...((spec.chain_of_custody as unknown[]) ?? []),
        {
          at: new Date().toISOString(),
          event: args.event,
          actor: args.actorId,
          location: args.location ?? null,
        },
      ] as never,
    });
    const evt =
      args.event === "received"
        ? LAB_EVENTS.SpecimenReceived
        : args.event === "rejected"
          ? LAB_EVENTS.SpecimenRejected
          : null;
    if (evt) {
      await emitLabEvent(this.sb, args.tenantId, evt, {
        specimenId: args.specimenId,
        location: args.location,
      });
    }
    await writeLabAudit(this.sb, {
      tenantId: args.tenantId,
      entityType: "lab_specimen",
      entityId: args.specimenId,
      action: `transit:${args.event}`,
      actorId: args.actorId,
    });
    return updated;
  }

  async reject(args: {
    tenantId: string;
    specimenId: string;
    reason: string;
    actorId: string | null;
  }): Promise<SpecimenRow> {
    const spec = await this.specimens.update(args.specimenId, {
      status: "rejected",
      rejection_reason: args.reason,
    });
    await this.tracking.insert({
      tenant_id: args.tenantId,
      specimen_id: args.specimenId,
      event: "rejected",
      actor_id: args.actorId,
      meta: { reason: args.reason } as never,
    });
    await emitLabEvent(this.sb, args.tenantId, LAB_EVENTS.SpecimenRejected, {
      specimenId: args.specimenId,
      reason: args.reason,
    });
    await writeLabAudit(this.sb, {
      tenantId: args.tenantId,
      entityType: "lab_specimen",
      entityId: args.specimenId,
      action: "rejected",
      actorId: args.actorId,
      reason: args.reason,
    });
    return spec;
  }
}

// -----------------------------------------------------------------------
// BarcodeEngine — enforces uniqueness (tenant + barcode value).
// -----------------------------------------------------------------------
export class BarcodeEngine {
  private readonly repo: BarcodeRepository;
  constructor(private readonly sb: SB) {
    this.repo = new BarcodeRepository(sb);
  }
  async print(args: {
    tenantId: string;
    specimenId?: string | null;
    containerId?: string | null;
    symbology: "code128" | "qr" | "datamatrix";
  }) {
    for (let i = 0; i < 5; i++) {
      const value = nextDocumentNumber("BC");
      const existing = await this.repo.findByValue(args.tenantId, value);
      if (existing) continue;
      return this.repo.insert({
        tenant_id: args.tenantId,
        specimen_id: args.specimenId ?? null,
        container_id: args.containerId ?? null,
        symbology: args.symbology,
        barcode_value: value,
        printed_at: new Date().toISOString(),
        is_active: true,
        meta: {} as never,
      });
    }
    throw new Error("Could not allocate a unique barcode after 5 attempts");
  }
}

// -----------------------------------------------------------------------
// AccessionEngine — collision-safe accession numbering (tenant scoped).
// -----------------------------------------------------------------------
export class AccessionEngine {
  private readonly repo: AccessionRepository;
  private readonly orders: LaboratoryOrderRepository;
  constructor(private readonly sb: SB) {
    this.repo = new AccessionRepository(sb);
    this.orders = new LaboratoryOrderRepository(sb);
  }
  async create(args: {
    tenantId: string;
    orderId: string;
    branchId?: string | null;
    receivedLocation?: string | null;
    receivedBy?: string | null;
    actorId: string | null;
  }): Promise<AccessionRow> {
    const order = await this.orders.getById(args.orderId);
    if (!order || order.tenant_id !== args.tenantId) throw new Error("Order not found");
    for (let i = 0; i < 5; i++) {
      const no = nextDocumentNumber("ACC");
      const existing = await this.repo.getByNumber(args.tenantId, no);
      if (existing) continue;
      const row = await this.repo.insert({
        tenant_id: args.tenantId,
        order_id: args.orderId,
        branch_id: args.branchId ?? order.branch_id,
        accession_no: no,
        received_at: new Date().toISOString(),
        received_by: args.receivedBy ?? args.actorId,
        received_location: args.receivedLocation ?? null,
        status: "accessioned",
        meta: {} as never,
      });
      await Promise.all([
        emitLabEvent(this.sb, args.tenantId, LAB_EVENTS.AccessionCreated, {
          accessionId: row.id,
          accessionNo: no,
          orderId: args.orderId,
        }),
        indexLabSearch(this.sb, {
          tenantId: args.tenantId,
          entityType: "lab_accession",
          entityId: row.id,
          title: `Accession ${no}`,
          subtitle: order.order_no,
          keywords: no,
        }),
        writeLabAudit(this.sb, {
          tenantId: args.tenantId,
          entityType: "lab_accession",
          entityId: row.id,
          action: "created",
          actorId: args.actorId,
        }),
      ]);
      return row;
    }
    throw new Error("Could not allocate a unique accession number after 5 attempts");
  }
}

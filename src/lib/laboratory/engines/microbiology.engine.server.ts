/**
 * MicrobiologyEngine + CultureEngine + SensitivityEngine — culture,
 * gram stain, organism identification, antibiotic sensitivity.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  CultureRepository,
  MicrobiologyRepository,
  SensitivityRepository,
} from "../repositories.server";
import { emitLabEvent, writeLabAudit } from "../helpers.server";
import { MICROBIOLOGY_EVENTS } from "../events";

type SB = SupabaseClient<Database>;

export class MicrobiologyEngine {
  private readonly repo: MicrobiologyRepository;
  constructor(private readonly sb: SB) {
    this.repo = new MicrobiologyRepository(sb);
  }
  async start(args: {
    tenantId: string;
    orderId: string;
    orderItemId?: string | null;
    specimenId?: string | null;
    requestKind: "culture" | "sensitivity" | "stain" | "other";
    actorId: string | null;
  }) {
    const row = await this.repo.insert({
      tenant_id: args.tenantId,
      order_id: args.orderId,
      order_item_id: args.orderItemId ?? null,
      specimen_id: args.specimenId ?? null,
      request_kind: args.requestKind,
      status: "in_progress",
      created_by: args.actorId,
      updated_by: args.actorId,
      meta: {} as never,
    });
    await emitLabEvent(this.sb, args.tenantId, MICROBIOLOGY_EVENTS.CultureStarted, {
      microbiologyOrderId: row.id,
    });
    await writeLabAudit(this.sb, {
      tenantId: args.tenantId,
      entityType: "lab_microbiology_order",
      entityId: row.id,
      action: "started",
      actorId: args.actorId,
    });
    return row;
  }
}

export class CultureEngine {
  private readonly repo: CultureRepository;
  private readonly micro: MicrobiologyRepository;
  constructor(private readonly sb: SB) {
    this.repo = new CultureRepository(sb);
    this.micro = new MicrobiologyRepository(sb);
  }
  async report(args: {
    tenantId: string;
    microbiologyOrderId: string;
    growthStatus: "no_growth" | "positive" | "mixed" | "contaminated" | "pending";
    gramStain?: string | null;
    colonyCount?: string | null;
    organismCode?: string | null;
    organismName?: string | null;
    notes?: string | null;
    reportedBy?: string | null;
    actorId: string | null;
  }) {
    const row = await this.repo.insert({
      tenant_id: args.tenantId,
      microbiology_order_id: args.microbiologyOrderId,
      growth_status: args.growthStatus,
      gram_stain: args.gramStain ?? null,
      colony_count: args.colonyCount ?? null,
      organism_code: args.organismCode ?? null,
      organism_name: args.organismName ?? null,
      notes: args.notes ?? null,
      reported_by: args.reportedBy ?? args.actorId,
      reported_at: new Date().toISOString(),
      meta: {} as never,
    });
    const evt =
      args.growthStatus === "no_growth"
        ? MICROBIOLOGY_EVENTS.CultureNoGrowth
        : args.growthStatus === "contaminated"
          ? MICROBIOLOGY_EVENTS.CultureContaminated
          : MICROBIOLOGY_EVENTS.CulturePositive;
    await emitLabEvent(this.sb, args.tenantId, evt, {
      cultureId: row.id,
      microbiologyOrderId: args.microbiologyOrderId,
    });
    await this.micro.update(args.microbiologyOrderId, {
      status: args.growthStatus === "pending" ? "in_progress" : "reported",
    });
    await writeLabAudit(this.sb, {
      tenantId: args.tenantId,
      entityType: "lab_culture",
      entityId: row.id,
      action: "reported",
      actorId: args.actorId,
    });
    return row;
  }
}

export class SensitivityEngine {
  private readonly repo: SensitivityRepository;
  constructor(private readonly sb: SB) {
    this.repo = new SensitivityRepository(sb);
  }
  async report(args: {
    tenantId: string;
    cultureId: string;
    entries: Array<{
      antibioticCode: string;
      antibioticName: string;
      method?: string | null;
      mic?: number | null;
      interpretation?: "S" | "I" | "R" | "SDD" | null;
    }>;
    actorId: string | null;
  }) {
    const rows = await this.repo.insertMany(
      args.entries.map((e) => ({
        tenant_id: args.tenantId,
        culture_id: args.cultureId,
        antibiotic_code: e.antibioticCode,
        antibiotic_name: e.antibioticName,
        method: e.method ?? null,
        mic: e.mic ?? null,
        interpretation: e.interpretation ?? null,
        reported_at: new Date().toISOString(),
        meta: {} as never,
      })),
    );
    await emitLabEvent(this.sb, args.tenantId, MICROBIOLOGY_EVENTS.SensitivityReported, {
      cultureId: args.cultureId,
      count: rows.length,
    });
    await writeLabAudit(this.sb, {
      tenantId: args.tenantId,
      entityType: "lab_culture",
      entityId: args.cultureId,
      action: "sensitivity_reported",
      actorId: args.actorId,
    });
    return rows;
  }
}

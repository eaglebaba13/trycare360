/**
 * AnalyzerEngine — instrument registry, queue orchestration, result ingestion.
 * Reuses Integration Dispatcher for ASTM/HL7/LIS drivers (never direct fetch).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  AnalyzerQueueRepository,
  AnalyzerRepository,
  AnalyzerResultRepository,
  type InstrumentRow,
} from "../repositories.server";
import { emitLabEvent, writeLabAudit } from "../helpers.server";
import { LAB_EVENTS } from "../events";

type SB = SupabaseClient<Database>;

export class AnalyzerEngine {
  private readonly analyzers: AnalyzerRepository;
  private readonly queues: AnalyzerQueueRepository;
  private readonly results: AnalyzerResultRepository;

  constructor(private readonly sb: SB) {
    this.analyzers = new AnalyzerRepository(sb);
    this.queues = new AnalyzerQueueRepository(sb);
    this.results = new AnalyzerResultRepository(sb);
  }

  async upsertInstrument(args: {
    tenantId: string;
    id?: string;
    code: string;
    name: string;
    branchId?: string | null;
    analyzerTypeId?: string | null;
    serialNo?: string | null;
    location?: string | null;
    connection?: Record<string, unknown>;
    status?: string;
    meta?: Record<string, unknown>;
    actorId: string | null;
  }): Promise<InstrumentRow> {
    return this.analyzers.upsert({
      id: args.id,
      tenant_id: args.tenantId,
      code: args.code,
      name: args.name,
      branch_id: args.branchId ?? null,
      analyzer_type_id: args.analyzerTypeId ?? null,
      serial_no: args.serialNo ?? null,
      location: args.location ?? null,
      connection: (args.connection ?? {}) as never,
      status: args.status ?? "online",
      meta: (args.meta ?? {}) as never,
      created_by: args.actorId,
      updated_by: args.actorId,
    });
  }

  async markOffline(tenantId: string, instrumentId: string): Promise<InstrumentRow> {
    const inst = await this.analyzers.setStatus(instrumentId, "offline");
    await emitLabEvent(this.sb, tenantId, LAB_EVENTS.AnalyzerOffline, {
      instrumentId,
    });
    return inst;
  }

  async enqueue(args: {
    tenantId: string;
    instrumentId: string;
    orderItemId?: string | null;
    specimenId?: string | null;
    meta?: Record<string, unknown>;
  }) {
    const instrument = await this.analyzers.getById(args.instrumentId);
    if (!instrument || instrument.tenant_id !== args.tenantId)
      throw new Error("Instrument not found");
    if (instrument.status !== "online")
      throw new Error(`Instrument is ${instrument.status}, cannot enqueue`);
    // Duplicate-assignment guard for the same order_item + queued state.
    if (args.orderItemId) {
      const dupes = await this.queues.listByInstrument(args.instrumentId, "queued");
      if (dupes.some((d) => d.order_item_id === args.orderItemId)) {
        throw new Error("Order item is already queued on this analyzer");
      }
    }
    return this.queues.insert({
      tenant_id: args.tenantId,
      instrument_id: args.instrumentId,
      order_item_id: args.orderItemId ?? null,
      specimen_id: args.specimenId ?? null,
      queued_at: new Date().toISOString(),
      status: "queued",
      meta: (args.meta ?? {}) as never,
    });
  }

  async ingestResult(args: {
    tenantId: string;
    instrumentId: string;
    queueId?: string | null;
    orderItemId?: string | null;
    testId?: string | null;
    numericValue?: number | null;
    textValue?: string | null;
    unitCode?: string | null;
    flag?: string | null;
    rawPayload?: Record<string, unknown>;
  }) {
    const row = await this.results.insert({
      tenant_id: args.tenantId,
      instrument_id: args.instrumentId,
      queue_id: args.queueId ?? null,
      order_item_id: args.orderItemId ?? null,
      test_id: args.testId ?? null,
      numeric_value: args.numericValue ?? null,
      text_value: args.textValue ?? null,
      unit_code: args.unitCode ?? null,
      flag: args.flag ?? null,
      raw_payload: (args.rawPayload ?? {}) as never,
      received_at: new Date().toISOString(),
      ingested_at: new Date().toISOString(),
      meta: {} as never,
    });
    if (args.queueId) {
      await this.queues.update(args.queueId, {
        status: "completed",
        completed_at: new Date().toISOString(),
      });
    }
    await emitLabEvent(this.sb, args.tenantId, LAB_EVENTS.AnalyzerResultReceived, {
      instrumentId: args.instrumentId,
      queueId: args.queueId,
      orderItemId: args.orderItemId,
    });
    await writeLabAudit(this.sb, {
      tenantId: args.tenantId,
      entityType: "lab_analyzer_result",
      entityId: row.id,
      action: "ingested",
    });
    return row;
  }
}

/**
 * OrderEngine — Laboratory order lifecycle.
 *
 * Lifecycle: draft → placed → in_progress → completed | cancelled
 * Reuses:
 *   - ClinicalContextLoader-friendly `clinicalOrderRef` from the caller
 *   - Billing (invoice_id) and Insurance (authorization_id) already resolved by Billing
 *   - Approval Engine (via requires_approval on the test catalog)
 *   - Workflow Engine — lab.order.placed / .cancelled
 *   - Timeline — patient/encounter timeline entry
 *   - Search — order becomes globally searchable
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  LaboratoryOrderItemRepository,
  LaboratoryOrderRepository,
  PanelRepository,
  TestCatalogRepository,
  type LabOrderRow,
} from "../repositories.server";
import {
  emitLabEvent,
  indexLabSearch,
  logLabTimeline,
  nextDocumentNumber,
  recordLabRevenue,
  writeLabAudit,
} from "../helpers.server";
import { LAB_EVENTS } from "../events";
import type { OrderCreateInput } from "../validators";

type SB = SupabaseClient<Database>;
type OrderCancelArgs = { tenantId: string; orderId: string; reason: string };

export class OrderEngine {
  private readonly orders: LaboratoryOrderRepository;
  private readonly items: LaboratoryOrderItemRepository;
  private readonly tests: TestCatalogRepository;
  private readonly panels: PanelRepository;

  constructor(private readonly sb: SB) {
    this.orders = new LaboratoryOrderRepository(sb);
    this.items = new LaboratoryOrderItemRepository(sb);
    this.tests = new TestCatalogRepository(sb);
    this.panels = new PanelRepository(sb);
  }

  async place(input: OrderCreateInput, actorId: string | null): Promise<LabOrderRow> {
    // Resolve any panel expansions and compute revenue amount for the Revenue signal.
    let amount = 0;
    for (const it of input.items) {
      if (it.itemKind === "test" && it.testId) {
        const t = await this.tests.getById(it.testId);
        if (!t) throw new Error(`Unknown test: ${it.testId}`);
        amount += Number(t.price ?? 0);
      } else if (it.itemKind === "panel" && it.panelId) {
        const p = await this.panels.getById(it.panelId);
        if (!p) throw new Error(`Unknown panel: ${it.panelId}`);
        amount += Number(p.price ?? 0);
      }
    }

    const header = await this.orders.insert({
      tenant_id: input.tenantId,
      branch_id: input.branchId ?? null,
      person_id: input.personId ?? null,
      patient_id: input.patientId ?? null,
      encounter_id: input.encounterId ?? null,
      ordering_provider_id: input.orderingProviderId ?? null,
      priority: input.priority,
      status: "placed",
      order_no: nextDocumentNumber("LAB"),
      ordered_at: new Date().toISOString(),
      fasting: input.fasting ?? null,
      notes: input.notes ?? null,
      diagnosis_codes: (input.diagnosisCodes ?? []) as never,
      clinical_order_ref: (input.clinicalOrderRef ?? {}) as never,
      external_order_ref: input.externalOrderRef ?? null,
      invoice_id: input.invoiceId ?? null,
      authorization_id: input.authorizationId ?? null,
      meta: {} as never,
      created_by: actorId,
      updated_by: actorId,
    });

    await this.items.insertMany(
      input.items.map((it) => ({
        tenant_id: input.tenantId,
        order_id: header.id,
        item_kind: it.itemKind,
        test_id: it.testId ?? null,
        panel_id: it.panelId ?? null,
        status: "pending",
        meta: (it.meta ?? {}) as never,
      })),
    );

    await Promise.all([
      emitLabEvent(this.sb, input.tenantId, LAB_EVENTS.OrderPlaced, {
        orderId: header.id,
        orderNo: header.order_no,
        personId: input.personId,
        priority: input.priority,
      }),
      indexLabSearch(this.sb, {
        tenantId: input.tenantId,
        entityType: "lab_order",
        entityId: header.id,
        title: `Lab order ${header.order_no}`,
        subtitle: input.priority.toUpperCase(),
        keywords: header.order_no,
      }),
      input.personId
        ? logLabTimeline(this.sb, {
            tenantId: input.tenantId,
            entityType: "person",
            entityId: input.personId,
            eventType: LAB_EVENTS.OrderPlaced,
            title: `Lab order ${header.order_no} placed`,
            meta: { orderId: header.id, priority: input.priority },
          })
        : Promise.resolve(),
      input.personId && amount > 0
        ? recordLabRevenue(this.sb, {
            tenantId: input.tenantId,
            personId: input.personId,
            amount,
            branchId: input.branchId ?? null,
            doctorId: input.orderingProviderId ?? null,
            sourceRef: header.id,
            category: "laboratory_order",
          })
        : Promise.resolve(),
      writeLabAudit(this.sb, {
        tenantId: input.tenantId,
        entityType: "lab_order",
        entityId: header.id,
        action: "placed",
        actorId,
      }),
    ]);

    return header;
  }

  async cancel(args: OrderCancelArgs, actorId: string | null): Promise<LabOrderRow> {
    const existing = await this.orders.getById(args.orderId);
    if (!existing || existing.tenant_id !== args.tenantId) throw new Error("Order not found");
    if (existing.status === "completed") throw new Error("Cannot cancel a completed order");
    const patched = await this.orders.update(args.orderId, {
      status: "cancelled",
      updated_by: actorId,
    });
    await Promise.all([
      emitLabEvent(this.sb, args.tenantId, LAB_EVENTS.OrderCancelled, {
        orderId: args.orderId,
        reason: args.reason,
      }),
      writeLabAudit(this.sb, {
        tenantId: args.tenantId,
        entityType: "lab_order",
        entityId: args.orderId,
        action: "cancelled",
        actorId,
        reason: args.reason,
      }),
    ]);
    return patched;
  }

  async markInProgress(tenantId: string, orderId: string): Promise<LabOrderRow> {
    const existing = await this.orders.getById(orderId);
    if (!existing || existing.tenant_id !== tenantId) throw new Error("Order not found");
    if (existing.status !== "placed") return existing;
    return this.orders.update(orderId, { status: "in_progress" });
  }

  async markCompletedIfAllVerified(tenantId: string, orderId: string): Promise<void> {
    const items = await this.items.listByOrder(orderId);
    if (!items.length) return;
    const allDone = items.every((i) => i.status === "released" || i.status === "cancelled");
    if (allDone) {
      await this.orders.update(orderId, { status: "completed" });
      await emitLabEvent(this.sb, tenantId, LAB_EVENTS.ResultReleased, {
        orderId,
        finalized: true,
      });
    }
  }
}

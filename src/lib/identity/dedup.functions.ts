/**
 * Deduplication — Server Functions (Stage C).
 *
 * Public API: scan a person, search the queue, review a candidate,
 * fetch dashboard stats. All calls go through `requireSupabaseAuth`
 * so RLS on `person_duplicate_candidates` is enforced as the caller.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const tenantId = z.string().uuid();
const uuid = z.string().uuid();

const scanSchema = z.object({
  tenant_id: tenantId,
  person_id: uuid,
  pool_cap: z.number().int().positive().max(1000).optional(),
});

const searchSchema = z.object({
  tenant_id: tenantId,
  status: z.enum(["open", "reviewing", "approved", "rejected", "deferred"]).optional(),
  min_score: z.number().min(0).max(1).optional(),
  limit: z.number().int().positive().max(100).default(25),
  offset: z.number().int().min(0).default(0),
});

const dashboardSchema = z.object({ tenant_id: tenantId });

const reviewSchema = z.object({
  tenant_id: tenantId,
  id: uuid,
  decision: z.enum(["reviewing", "approved", "rejected", "deferred"]),
  notes: z.string().trim().max(500).nullish(),
});

// -----------------------------------------------------------------------

export const scanPersonForDuplicates = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => scanSchema.parse(d))
  .handler(async ({ context, data }) => {
    const { scanPerson } = await import("./dedup.server");
    const { emitIdentityEvent } = await import("./events.server");

    const result = await scanPerson(context.supabase, {
      tenantId: data.tenant_id,
      personId: data.person_id,
      poolCap: data.pool_cap,
    });

    for (const d of result.detected) {
      if (d.created) {
        await emitIdentityEvent(context.supabase, {
          tenantId: data.tenant_id,
          // biome-ignore lint/suspicious/noExplicitAny: dedup events not in Stage B enum
          eventType: "duplicate.detected" as any,
          payload: {
            person_id: data.person_id,
            other_person_id: d.otherId,
            score: d.score,
            band: d.band,
          },
          entityRef: { type: "duplicate_candidate", person_a: data.person_id, person_b: d.otherId },
        });
      }
    }
    return result;
  });

export const searchDuplicates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => searchSchema.parse(d))
  .handler(async ({ context, data }) => {
    const { DuplicateCandidateRepository } = await import("./dedup.server");
    const repo = new DuplicateCandidateRepository(context.supabase);
    const { rows, total } = await repo.search({
      tenantId: data.tenant_id,
      status: data.status,
      minScore: data.min_score,
      limit: data.limit,
      offset: data.offset,
    });
    return { rows, total, limit: data.limit, offset: data.offset };
  });

export const getDuplicateDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => dashboardSchema.parse(d))
  .handler(async ({ context, data }) => {
    const { computeDashboard } = await import("./dedup.server");
    return await computeDashboard(context.supabase, data.tenant_id);
  });

export const reviewDuplicate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => reviewSchema.parse(d))
  .handler(async ({ context, data }) => {
    const { DuplicateCandidateRepository } = await import("./dedup.server");
    const { emitIdentityEvent } = await import("./events.server");
    const repo = new DuplicateCandidateRepository(context.supabase);
    const row = await repo.updateStatus(data.tenant_id, data.id, data.decision, context.userId);

    const eventType =
      data.decision === "approved"
        ? "duplicate.reviewed"
        : data.decision === "rejected" || data.decision === "deferred"
          ? "duplicate.dismissed"
          : "duplicate.reviewed";

    await emitIdentityEvent(context.supabase, {
      tenantId: data.tenant_id,
      // biome-ignore lint/suspicious/noExplicitAny: dedup events not in Stage B enum
      eventType: eventType as any,
      payload: {
        candidate_id: data.id,
        decision: data.decision,
        notes: data.notes ?? null,
        person_a_id: row.person_a_id,
        person_b_id: row.person_b_id,
      },
      entityRef: { type: "duplicate_candidate", id: data.id },
    });
    return { candidate: row };
  });

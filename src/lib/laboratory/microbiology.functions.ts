/**
 * Laboratory — Microbiology, cultures, sensitivity panels.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { cultureReportSchema, microStartSchema, sensitivitySchema } from "./validators";
import {
  CultureEngine,
  MicrobiologyEngine,
  SensitivityEngine,
} from "./engines/microbiology.engine.server";
import { CultureRepository, MicrobiologyRepository } from "./repositories.server";
import { z } from "zod";

export const startMicrobiology = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => microStartSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new MicrobiologyEngine(context.supabase);
    return { order: await engine.start({ ...data, actorId: context.userId }) };
  });

export const reportCulture = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => cultureReportSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new CultureEngine(context.supabase);
    return { culture: await engine.report({ ...data, actorId: context.userId }) };
  });

export const reportSensitivity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => sensitivitySchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new SensitivityEngine(context.supabase);
    return { rows: await engine.report({ ...data, actorId: context.userId }) };
  });

export const listCultures = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ tenantId: z.string().uuid(), microbiologyOrderId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const repo = new CultureRepository(context.supabase);
    return { rows: await repo.listForMicroOrder(data.microbiologyOrderId) };
  });

export const getMicrobiologyOrder = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ tenantId: z.string().uuid(), id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const repo = new MicrobiologyRepository(context.supabase);
    const row = await repo.getById(data.id);
    if (!row || row.tenant_id !== data.tenantId) throw new Error("Not found");
    return { order: row };
  });

/**
 * Laboratory — Pathology cases (histopathology / cytology / frozen).
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { pathologyCreateSchema, pathologyReportSchema } from "./validators";
import { PathologyEngine } from "./engines/pathology.engine.server";
import { PathologyRepository } from "./repositories.server";
import { z } from "zod";

export const createPathologyCase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => pathologyCreateSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new PathologyEngine(context.supabase);
    return { case: await engine.create({ ...data, actorId: context.userId }) };
  });

export const transitionPathologyCase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        tenantId: z.string().uuid(),
        caseId: z.string().uuid(),
        to: z.enum(["grossing", "processing", "reviewing", "reported"]),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const engine = new PathologyEngine(context.supabase);
    return { case: await engine.transition({ ...data, actorId: context.userId }) };
  });

export const reportPathologyCase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => pathologyReportSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new PathologyEngine(context.supabase);
    return { case: await engine.report({ ...data, actorId: context.userId }) };
  });

export const listPathologyCases = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ tenantId: z.string().uuid(), status: z.string().optional() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const repo = new PathologyRepository(context.supabase);
    return { rows: await repo.list(data.tenantId, data.status) };
  });

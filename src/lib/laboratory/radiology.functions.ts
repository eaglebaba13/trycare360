/**
 * Laboratory — Radiology / Imaging server functions.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  imagingMetadataSchema,
  radiologyOrderSchema,
  radiologyReportSchema,
  radiologyStudySchema,
} from "./validators";
import {
  ImagingMetadataEngine,
  RadiologyEngine,
} from "./engines/radiology.engine.server";
import {
  ImagingRepository,
  RadiologyRepository,
} from "./repositories.server";
import { z } from "zod";

export const placeRadiologyOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => radiologyOrderSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new RadiologyEngine(context.supabase);
    return { order: await engine.order({ ...data, actorId: context.userId }) };
  });

export const scheduleRadiologyOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        tenantId: z.string().uuid(),
        radOrderId: z.string().uuid(),
        scheduledAt: z.string().datetime({ offset: true }),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const engine = new RadiologyEngine(context.supabase);
    return { order: await engine.schedule(data.tenantId, data.radOrderId, data.scheduledAt) };
  });

export const recordStudy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => radiologyStudySchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new RadiologyEngine(context.supabase);
    return { study: await engine.recordStudy({ ...data, actorId: context.userId }) };
  });

export const reportStudy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => radiologyReportSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new RadiologyEngine(context.supabase);
    return { study: await engine.report({ ...data, actorId: context.userId }) };
  });

export const attachImagingMetadata = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => imagingMetadataSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new ImagingMetadataEngine(context.supabase);
    return { metadata: await engine.attach(data) };
  });

export const listRadiologyOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ tenantId: z.string().uuid(), status: z.string().optional() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const repo = new RadiologyRepository(context.supabase);
    return { rows: await repo.listOrders(data.tenantId, data.status) };
  });

export const listStudyMetadata = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ tenantId: z.string().uuid(), studyId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const repo = new ImagingRepository(context.supabase);
    return { rows: await repo.listMetadata(data.studyId) };
  });

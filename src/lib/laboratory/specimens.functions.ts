/**
 * Laboratory — specimen collection, chain-of-custody, barcode print.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  barcodePrintSchema,
  specimenCollectSchema,
  specimenIdSchema,
  specimenRejectSchema,
  specimenTransitSchema,
} from "./validators";
import {
  BarcodeEngine,
  SpecimenEngine,
} from "./engines/specimen.engine.server";
import {
  SpecimenRepository,
  SpecimenTrackingRepository,
} from "./repositories.server";

export const collectSpecimen = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => specimenCollectSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new SpecimenEngine(context.supabase);
    return { specimen: await engine.collect(data, context.userId) };
  });

export const trackSpecimen = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => specimenTransitSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new SpecimenEngine(context.supabase);
    return { specimen: await engine.transit({ ...data, actorId: context.userId }) };
  });

export const rejectSpecimen = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => specimenRejectSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new SpecimenEngine(context.supabase);
    return { specimen: await engine.reject({ ...data, actorId: context.userId }) };
  });

export const getSpecimen = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => specimenIdSchema.parse(d))
  .handler(async ({ context, data }) => {
    const repo = new SpecimenRepository(context.supabase);
    const track = new SpecimenTrackingRepository(context.supabase);
    const s = await repo.getById(data.specimenId);
    if (!s || s.tenant_id !== data.tenantId) throw new Error("Not found");
    return {
      specimen: s,
      containers: await repo.listContainers(s.id),
      tracking: await track.listForSpecimen(s.id),
    };
  });

export const printBarcode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => barcodePrintSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new BarcodeEngine(context.supabase);
    return { barcode: await engine.print(data) };
  });

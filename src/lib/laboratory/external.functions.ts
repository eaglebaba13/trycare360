/**
 * Laboratory — external reference-lab submission + result ingestion.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { externalIngestSchema, externalSubmitSchema } from "./validators";
import { ExternalLabEngine } from "./engines/distribution.engine.server";

export const submitExternalOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => externalSubmitSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new ExternalLabEngine(context.supabase);
    return { order: await engine.submit({ ...data, actorId: context.userId }) };
  });

export const ingestExternalResult = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => externalIngestSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new ExternalLabEngine(context.supabase);
    return { result: await engine.ingestResult({ ...data, actorId: context.userId }) };
  });

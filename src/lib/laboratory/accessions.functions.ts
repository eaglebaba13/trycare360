/**
 * Laboratory — accession creation lookup.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { accessionCreateSchema } from "./validators";
import { AccessionEngine } from "./engines/specimen.engine.server";

export const createAccession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => accessionCreateSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new AccessionEngine(context.supabase);
    return {
      accession: await engine.create({ ...data, actorId: context.userId }),
    };
  });

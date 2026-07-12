/**
 * Tax server functions.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { taxListSchema, taxPostSchema } from "./validators";
import { TaxEngine } from "./engines/tax.engine.server";
import { TaxRepository } from "./repositories.server";

export const postTax = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => taxPostSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new TaxEngine(context.supabase);
    return { entry: await engine.post(data, context.userId) };
  });

export const listTaxes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => taxListSchema.parse(d))
  .handler(async ({ context, data }) => {
    const repo = new TaxRepository(context.supabase);
    return { rows: await repo.list(data) };
  });

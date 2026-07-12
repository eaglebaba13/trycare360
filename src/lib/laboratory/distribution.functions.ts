/**
 * Laboratory — report distribution across channels.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { distributionSendSchema } from "./validators";
import { DistributionEngine } from "./engines/distribution.engine.server";
import { DistributionRepository } from "./repositories.server";
import { z } from "zod";

export const sendDistribution = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => distributionSendSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new DistributionEngine(context.supabase);
    return { log: await engine.send({ ...data, actorId: context.userId }) };
  });

export const listDistribution = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ tenantId: z.string().uuid(), orderId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const repo = new DistributionRepository(context.supabase);
    return { rows: await repo.listForOrder(data.orderId) };
  });

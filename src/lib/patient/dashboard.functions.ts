/**
 * Patient Portal — Dashboard aggregation server function.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { DashboardEngine } from "./engines/dashboard.engine.server";
import { dashboardSchema } from "./validators";

export const getPatientPortalDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => dashboardSchema.parse(d ?? {}))
  .handler(async ({ context, data }) => {
    const engine = new DashboardEngine(context.supabase);
    return await engine.getDashboard({
      viewerUserId: context.userId,
      targetUserId: data.targetUserId,
      limit: data.limit,
    });
  });

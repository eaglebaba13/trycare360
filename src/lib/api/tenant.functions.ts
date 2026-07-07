import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const setActiveTenant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z
      .object({
        tenantId: z.string().uuid().nullable(),
        orgUnitId: z.string().uuid().nullable().optional(),
      })
      .parse(i),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({
        active_tenant_id: data.tenantId,
        active_org_unit_id: data.orgUnitId ?? null,
      })
      .eq("id", context.userId);
    if (error) throw error;
    return { ok: true };
  });

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { assertFamilyPermission, resolvePatientIdentity } from "../helpers.server";

// biome-ignore lint/suspicious/noExplicitAny: escape from deep generics
type SB = SupabaseClient<Database> | any;

/**
 * Teleconsult engine — patient view over Scheduling teleconsult
 * appointments. Video provisioning stays inside the platform video
 * server service; this engine only surfaces metadata and validates
 * join eligibility (consent + patient identity + within join
 * window).
 */
export class TeleconsultEngine {
  constructor(private readonly sb: SB) {}

  async list(args: { viewerUserId: string; targetUserId?: string; limit?: number }) {
    const target = args.targetUserId ?? args.viewerUserId;
    if (target !== args.viewerUserId) {
      await assertFamilyPermission(this.sb, { viewerUserId: args.viewerUserId, targetUserId: target, capability: "view" });
    }
    const identity = await resolvePatientIdentity(this.sb, target);
    if (!identity.personId || !identity.tenantId) return [];
    const { data, error } = await this.sb
      .from("appointments")
      .select("id, starts_at, ends_at, status_code, meta")
      .eq("tenant_id", identity.tenantId)
      .eq("person_id", identity.personId)
      .contains("meta", { modality: "teleconsult" })
      .order("starts_at", { ascending: false })
      .limit(args.limit ?? 50);
    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async joinInfo(args: { viewerUserId: string; appointmentId: string }) {
    const { data, error } = await this.sb
      .from("appointments")
      .select("id, tenant_id, person_id, starts_at, ends_at, status_code, meta")
      .eq("id", args.appointmentId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("Appointment not found");
    const identity = await resolvePatientIdentity(this.sb, args.viewerUserId);
    if (identity.personId !== data.person_id) {
      // family-delegated view is enough for join info
      // resolve target user via person_id → patient_profiles
      const { data: prof } = await this.sb
        .from("patient_profiles")
        .select("patient_user_id")
        .eq("person_id", data.person_id)
        .maybeSingle();
      if (prof?.patient_user_id) {
        await assertFamilyPermission(this.sb, {
          viewerUserId: args.viewerUserId,
          targetUserId: prof.patient_user_id,
          capability: "view",
        });
      } else {
        throw new Error("Forbidden");
      }
    }

    const meta = (data.meta as Record<string, unknown>) ?? {};
    const startsAt = Date.parse(data.starts_at);
    const now = Date.now();
    const joinWindowOpens = startsAt - 15 * 60_000;
    const joinable = now >= joinWindowOpens && now <= (data.ends_at ? Date.parse(data.ends_at) : startsAt + 60 * 60_000);
    return {
      appointmentId: data.id,
      joinable,
      joinUrl: (meta.join_url as string) ?? null,
      provider: (meta.video_provider as string) ?? null,
    };
  }
}

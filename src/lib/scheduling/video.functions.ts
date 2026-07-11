/**
 * Scheduling — Video Consultation server functions (Stage 5).
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { VIDEO_ADAPTERS, type VideoProvider } from "./video.server";
import { VIDEO_EVENTS } from "./events";

const uuid = z.string().uuid();

export const generateVideoMeeting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        tenant_id: uuid,
        appointment_id: uuid,
        provider: z.enum(["google_meet", "zoom"]),
        attendees_emails: z.array(z.string().email()).default([]),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { data: appt, error: readErr } = await context.supabase
      .from("appointments")
      .select("id,starts_at,ends_at,timezone,appointment_code")
      .eq("id", data.appointment_id)
      .single();
    if (readErr) throw new Error(readErr.message);

    const adapter = VIDEO_ADAPTERS[data.provider as VideoProvider];
    const result = await adapter.createMeeting({
      title: `Consultation ${(appt as { appointment_code: string }).appointment_code}`,
      starts_at: (appt as { starts_at: string }).starts_at,
      ends_at: (appt as { ends_at: string }).ends_at,
      timezone: (appt as { timezone: string | null }).timezone,
      attendees_emails: data.attendees_emails,
    });

    if (!result.ok || !result.ref) {
      await context.supabase.rpc("emit_automation_event", {
        _tenant_id: data.tenant_id,
        _event_type: VIDEO_EVENTS.MEETING_FAILED,
        _payload: {
          appointment_id: data.appointment_id,
          provider: data.provider,
          error: result.error ?? "unknown",
        } as never,
        _entity_ref: {
          type: "appointment",
          id: data.appointment_id,
        } as never,
      });
      return { ok: false, error: result.error ?? "unknown" };
    }

    const { error: updErr } = await context.supabase
      .from("appointments")
      .update({
        video_provider: result.ref.provider,
        video_session_id: result.ref.session_id,
        meta: {
          video_meeting: {
            join_url: result.ref.join_url,
            host_url: result.ref.host_url ?? null,
            passcode: result.ref.passcode ?? null,
          },
        } as never,
      } as never)
      .eq("id", data.appointment_id);
    if (updErr) throw new Error(updErr.message);

    await context.supabase.rpc("emit_automation_event", {
      _tenant_id: data.tenant_id,
      _event_type: VIDEO_EVENTS.MEETING_CREATED,
      _payload: {
        appointment_id: data.appointment_id,
        provider: data.provider,
        join_url: result.ref.join_url,
      } as never,
      _entity_ref: { type: "appointment", id: data.appointment_id } as never,
    });

    return { ok: true, ref: result.ref };
  });

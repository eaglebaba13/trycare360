/**
 * Patient Portal — Notification server functions.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { NotificationEngine } from "./engines/notifications.engine.server";
import {
  emptySchema,
  notificationHistorySchema,
  registerPushTokenSchema,
  removePushTokenSchema,
  updateNotificationPrefSchema,
} from "./validators";

export const getNotificationPreferences = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => emptySchema.parse(d ?? {}))
  .handler(async ({ context }) => {
    const engine = new NotificationEngine(context.supabase);
    return { rows: await engine.getPreferences(context.userId) };
  });

export const updateNotificationPreferences = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => updateNotificationPrefSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new NotificationEngine(context.supabase);
    return { preference: await engine.updatePreference(context.userId, data) };
  });

export const registerPushToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => registerPushTokenSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new NotificationEngine(context.supabase);
    return { token: await engine.registerPushToken(context.userId, data) };
  });

export const removePushToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => removePushTokenSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new NotificationEngine(context.supabase);
    await engine.removePushToken(context.userId, data.token);
    return { ok: true };
  });

export const listNotificationHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => notificationHistorySchema.parse(d ?? {}))
  .handler(async ({ context, data }) => {
    const engine = new NotificationEngine(context.supabase);
    return { rows: await engine.listHistory(context.userId, data.limit) };
  });

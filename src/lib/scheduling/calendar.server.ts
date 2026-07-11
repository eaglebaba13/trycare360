/**
 * Scheduling — External Calendar provider abstraction (server-only).
 *
 * NO UI is created in Stage 2; this is the transport contract that
 * Stage 5 (integrations & reminders) will wire to real providers.
 * Every method returns a Result-shaped DTO so the caller can log a
 * partial failure without blocking the booking transaction.
 */

export type CalendarProvider = "google" | "outlook";

export interface CalendarEventDraft {
  external_id?: string | null;
  title: string;
  description?: string | null;
  starts_at: string;
  ends_at: string;
  timezone?: string | null;
  location?: string | null;
  attendees_emails?: string[];
  meta?: Record<string, unknown>;
}

export interface CalendarEventRef {
  provider: CalendarProvider;
  external_id: string;
  html_link?: string | null;
  meeting_url?: string | null;
}

export interface CalendarSyncResult {
  ok: boolean;
  ref?: CalendarEventRef;
  error?: string;
}

export interface CalendarProviderAdapter {
  provider: CalendarProvider;
  createEvent(
    accountId: string,
    draft: CalendarEventDraft,
  ): Promise<CalendarSyncResult>;
  updateEvent(
    accountId: string,
    externalId: string,
    draft: CalendarEventDraft,
  ): Promise<CalendarSyncResult>;
  cancelEvent(
    accountId: string,
    externalId: string,
  ): Promise<CalendarSyncResult>;
}

/**
 * Stub Google Calendar adapter. Real implementation lives in Stage 5;
 * this keeps the abstraction present so the Coordinator + reminders
 * pipeline can already depend on it.
 */
export const googleCalendarAdapter: CalendarProviderAdapter = {
  provider: "google",
  async createEvent() {
    return { ok: false, error: "google_calendar_not_configured" };
  },
  async updateEvent() {
    return { ok: false, error: "google_calendar_not_configured" };
  },
  async cancelEvent() {
    return { ok: false, error: "google_calendar_not_configured" };
  },
};

/**
 * Stub Outlook Calendar adapter — same contract as Google.
 */
export const outlookCalendarAdapter: CalendarProviderAdapter = {
  provider: "outlook",
  async createEvent() {
    return { ok: false, error: "outlook_calendar_not_configured" };
  },
  async updateEvent() {
    return { ok: false, error: "outlook_calendar_not_configured" };
  },
  async cancelEvent() {
    return { ok: false, error: "outlook_calendar_not_configured" };
  },
};

export function getCalendarAdapter(
  provider: CalendarProvider,
): CalendarProviderAdapter {
  if (provider === "google") return googleCalendarAdapter;
  if (provider === "outlook") return outlookCalendarAdapter;
  throw new Error(`Unknown calendar provider: ${provider}`);
}

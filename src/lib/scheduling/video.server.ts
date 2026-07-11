/**
 * Scheduling — Video Consultation provider abstraction.
 *
 * Interface only; concrete providers (Google Meet, Zoom) are wired in
 * later phases. Meeting metadata is stored inline on the appointment
 * (`video_provider`, `video_session_id`, `meta.meeting_url`).
 */
export type VideoProvider = "google_meet" | "zoom";

export interface VideoMeetingDraft {
  title: string;
  starts_at: string;
  ends_at: string;
  timezone?: string | null;
  attendees_emails?: string[];
  host_email?: string;
}

export interface VideoMeetingRef {
  provider: VideoProvider;
  session_id: string;
  join_url: string;
  host_url?: string | null;
  passcode?: string | null;
}

export interface VideoProviderAdapter {
  provider: VideoProvider;
  createMeeting(draft: VideoMeetingDraft): Promise<{
    ok: boolean;
    ref?: VideoMeetingRef;
    error?: string;
  }>;
  cancelMeeting(sessionId: string): Promise<{ ok: boolean; error?: string }>;
}

export const googleMeetAdapter: VideoProviderAdapter = {
  provider: "google_meet",
  async createMeeting() {
    return { ok: false, error: "google_meet_not_configured" };
  },
  async cancelMeeting() {
    return { ok: false, error: "google_meet_not_configured" };
  },
};

export const zoomAdapter: VideoProviderAdapter = {
  provider: "zoom",
  async createMeeting() {
    return { ok: false, error: "zoom_not_configured" };
  },
  async cancelMeeting() {
    return { ok: false, error: "zoom_not_configured" };
  },
};

export const VIDEO_ADAPTERS: Record<VideoProvider, VideoProviderAdapter> = {
  google_meet: googleMeetAdapter,
  zoom: zoomAdapter,
};

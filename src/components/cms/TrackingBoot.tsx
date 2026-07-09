/**
 * Injects marketing tracking on public pages:
 *  - parses UTM params + persists first_touch / last_touch cookies
 *  - fires an initial page_view beacon to /api/public/cms/track
 *  - injects GA4 (gtag), GTM and Meta Pixel snippets from site tracking config
 *    when respective IDs are configured
 */
import { useEffect } from "react";

type Tracking = {
  ga4_id?: string;
  gtm_id?: string;
  meta_pixel_id?: string;
  gsc_verification?: string;
};

function visitorId(): string {
  const KEY = "tc360_vid";
  let v = localStorage.getItem(KEY);
  if (!v) {
    v = crypto.randomUUID();
    localStorage.setItem(KEY, v);
  }
  return v;
}
function sessionId(): string {
  const KEY = "tc360_sid";
  let v = sessionStorage.getItem(KEY);
  if (!v) {
    v = crypto.randomUUID();
    sessionStorage.setItem(KEY, v);
  }
  return v;
}
function parseUtm(): Record<string, string> {
  const params = new URLSearchParams(window.location.search);
  const out: Record<string, string> = {};
  for (const k of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"]) {
    const v = params.get(k);
    if (v) out[k] = v;
  }
  return out;
}
function readCookie(name: string): string | null {
  const m = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
  return m ? decodeURIComponent(m[1]) : null;
}
function writeCookie(name: string, value: string, days = 365) {
  const exp = new Date(Date.now() + days * 86_400_000).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${exp}; path=/; SameSite=Lax`;
}

export function TrackingBoot({ tracking, pageId }: { tracking?: Tracking | null; pageId?: string }) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const utm = parseUtm();
    let firstTouch = readCookie("tc360_ft");
    if (!firstTouch && Object.keys(utm).length > 0) {
      firstTouch = JSON.stringify({ ...utm, at: Date.now() });
      writeCookie("tc360_ft", firstTouch);
    }
    if (Object.keys(utm).length > 0) {
      writeCookie("tc360_lt", JSON.stringify({ ...utm, at: Date.now() }), 30);
    }
    const lastTouch = readCookie("tc360_lt");

    // Injections
    if (tracking?.gtm_id) {
      const s = document.createElement("script");
      s.async = true;
      s.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(tracking.gtm_id)}`;
      document.head.appendChild(s);
    }
    if (tracking?.ga4_id) {
      const s = document.createElement("script");
      s.async = true;
      s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(tracking.ga4_id)}`;
      document.head.appendChild(s);
      const w = window as unknown as { dataLayer?: unknown[]; gtag?: (...a: unknown[]) => void };
      w.dataLayer = w.dataLayer || [];
      w.gtag = function () {
        // eslint-disable-next-line prefer-rest-params
        w.dataLayer!.push(arguments);
      };
      w.gtag("js", new Date());
      w.gtag("config", tracking.ga4_id);
    }
    if (tracking?.meta_pixel_id) {
      const w = window as unknown as { fbq?: (...a: unknown[]) => void; _fbq?: unknown };
      if (!w.fbq) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const n: any = function () {
          // eslint-disable-next-line prefer-rest-params
          n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
        };
        n.push = n;
        n.loaded = true;
        n.version = "2.0";
        n.queue = [];
        w.fbq = n;
        w._fbq = n;
        const t = document.createElement("script");
        t.async = true;
        t.src = "https://connect.facebook.net/en_US/fbevents.js";
        document.head.appendChild(t);
      }
      w.fbq!("init", tracking.meta_pixel_id);
      w.fbq!("track", "PageView");
    }

    // First-party beacon
    try {
      const payload = {
        page_id: pageId,
        event_type: "page_view",
        visitor_id: visitorId(),
        session_id: sessionId(),
        path: window.location.pathname,
        referrer: document.referrer || undefined,
        utm,
        first_touch: firstTouch ? JSON.parse(firstTouch) : undefined,
        last_touch: lastTouch ? JSON.parse(lastTouch) : undefined,
      };
      const body = JSON.stringify(payload);
      if (navigator.sendBeacon) {
        navigator.sendBeacon("/api/public/cms/track", new Blob([body], { type: "application/json" }));
      } else {
        fetch("/api/public/cms/track", { method: "POST", headers: { "content-type": "application/json" }, body, keepalive: true });
      }
    } catch {
      /* noop */
    }
  }, [tracking?.ga4_id, tracking?.gtm_id, tracking?.meta_pixel_id, pageId]);

  return null;
}

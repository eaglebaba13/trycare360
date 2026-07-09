/**
 * Deduplication — Pluggable Matching Strategies.
 *
 * Each strategy exposes `evaluate(a, b) -> { score, signals, matched }`
 * where `score` is in [0, 1]. The `DedupEngine` combines strategy scores
 * with weights loaded from `platform_settings` (key: `dedup.weights`),
 * so tuning happens without a redeploy.
 *
 * Adding a new matcher (future AI/ML matcher): implement `Matcher`,
 * register it in `defaultMatchers()`, and add a weight entry to the
 * config document. No changes to callers of `DedupEngine.evaluate()`.
 */
import type { Tables } from "@/integrations/supabase/types";
import {
  normalizeAddress,
  normalizeName,
  nameTokens,
  normalizePincode,
  similarity,
  tokenJaccard,
} from "./normalization";

export type PersonLike = Pick<
  Tables<"persons">,
  | "id"
  | "full_name"
  | "first_name"
  | "last_name"
  | "phone_e164"
  | "email_normalized"
  | "national_id_hash"
  | "dob"
  | "gender"
  | "primary_address_line1"
  | "primary_address_city"
  | "primary_address_state"
  | "primary_address_country"
  | "primary_address_pincode"
>;

export interface MatchOutput {
  matched: boolean;      // did this matcher find any relevant signal?
  score: number;         // 0..1
  signals: Record<string, unknown>;
}

export interface Matcher {
  code: string;          // stable id used as the weight key
  label: string;         // human-readable
  evaluate(a: PersonLike, b: PersonLike): MatchOutput;
}

// ---------- Individual matchers -------------------------------------------

const noMatch: MatchOutput = { matched: false, score: 0, signals: {} };

export const nationalIdMatcher: Matcher = {
  code: "national_id",
  label: "National ID (hash)",
  evaluate: (a, b) => {
    if (!a.national_id_hash || !b.national_id_hash) return noMatch;
    const eq = a.national_id_hash === b.national_id_hash;
    return { matched: true, score: eq ? 1 : 0, signals: { national_id_equal: eq } };
  },
};

export const phoneExactMatcher: Matcher = {
  code: "phone_exact",
  label: "Phone (exact)",
  evaluate: (a, b) => {
    if (!a.phone_e164 || !b.phone_e164) return noMatch;
    const eq = a.phone_e164 === b.phone_e164;
    return { matched: true, score: eq ? 1 : 0, signals: { phone_equal: eq } };
  },
};

export const emailExactMatcher: Matcher = {
  code: "email_exact",
  label: "Email (exact)",
  evaluate: (a, b) => {
    if (!a.email_normalized || !b.email_normalized) return noMatch;
    const eq = a.email_normalized === b.email_normalized;
    return { matched: true, score: eq ? 1 : 0, signals: { email_equal: eq } };
  },
};

export const phoneSuffixMatcher: Matcher = {
  code: "phone_suffix",
  label: "Phone (last 7 digits)",
  evaluate: (a, b) => {
    const pa = (a.phone_e164 ?? "").replace(/\D/g, "");
    const pb = (b.phone_e164 ?? "").replace(/\D/g, "");
    if (!pa || !pb) return noMatch;
    const suf = (s: string) => s.slice(-7);
    const eq = suf(pa) === suf(pb);
    return { matched: true, score: eq ? 0.9 : 0, signals: { phone_suffix_equal: eq } };
  },
};

export const emailLocalMatcher: Matcher = {
  code: "email_local",
  label: "Email (local-part similarity)",
  evaluate: (a, b) => {
    if (!a.email_normalized || !b.email_normalized) return noMatch;
    const la = a.email_normalized.split("@")[0] ?? "";
    const lb = b.email_normalized.split("@")[0] ?? "";
    if (!la || !lb) return noMatch;
    const s = similarity(la, lb);
    return { matched: true, score: s, signals: { email_local_similarity: s } };
  },
};

export const fuzzyNameMatcher: Matcher = {
  code: "fuzzy_name",
  label: "Name (fuzzy)",
  evaluate: (a, b) => {
    const ta = nameTokens(a.full_name);
    const tb = nameTokens(b.full_name);
    if (ta.length === 0 || tb.length === 0) return noMatch;
    const jac = tokenJaccard(ta, tb);
    const lev = similarity(normalizeName(a.full_name), normalizeName(b.full_name));
    const score = Math.max(jac, lev);
    return {
      matched: true,
      score,
      signals: { name_jaccard: jac, name_similarity: lev },
    };
  },
};

export const dobMatcher: Matcher = {
  code: "dob",
  label: "Date of birth",
  evaluate: (a, b) => {
    if (!a.dob || !b.dob) return noMatch;
    const eq = a.dob === b.dob;
    return { matched: true, score: eq ? 1 : 0, signals: { dob_equal: eq } };
  },
};

export const genderMatcher: Matcher = {
  code: "gender",
  label: "Gender",
  evaluate: (a, b) => {
    if (!a.gender || !b.gender) return noMatch;
    const eq = a.gender === b.gender;
    return { matched: true, score: eq ? 1 : 0, signals: { gender_equal: eq } };
  },
};

export const addressSimilarityMatcher: Matcher = {
  code: "address_similarity",
  label: "Address (fuzzy)",
  evaluate: (a, b) => {
    const aa = normalizeAddress({
      line1: a.primary_address_line1,
      city: a.primary_address_city,
      state: a.primary_address_state,
      country: a.primary_address_country,
      pincode: a.primary_address_pincode,
    });
    const bb = normalizeAddress({
      line1: b.primary_address_line1,
      city: b.primary_address_city,
      state: b.primary_address_state,
      country: b.primary_address_country,
      pincode: b.primary_address_pincode,
    });
    if (!aa || !bb) return noMatch;
    const s = similarity(aa, bb);
    return { matched: true, score: s, signals: { address_similarity: s } };
  },
};

export const pincodeMatcher: Matcher = {
  code: "pincode",
  label: "PIN code",
  evaluate: (a, b) => {
    const pa = normalizePincode(a.primary_address_pincode);
    const pb = normalizePincode(b.primary_address_pincode);
    if (!pa || !pb) return noMatch;
    const eq = pa === pb;
    return { matched: true, score: eq ? 1 : 0, signals: { pincode_equal: eq } };
  },
};

/** Register the built-in matcher set. Add future strategies here. */
export function defaultMatchers(): Matcher[] {
  return [
    nationalIdMatcher,
    phoneExactMatcher,
    emailExactMatcher,
    phoneSuffixMatcher,
    emailLocalMatcher,
    fuzzyNameMatcher,
    dobMatcher,
    genderMatcher,
    addressSimilarityMatcher,
    pincodeMatcher,
  ];
}

// ---------- Engine --------------------------------------------------------

/** Default weights when no `dedup.weights` config exists for the tenant. */
export const DEFAULT_WEIGHTS: Record<string, number> = {
  national_id: 1.0,
  phone_exact: 0.9,
  email_exact: 0.8,
  phone_suffix: 0.4,
  email_local: 0.3,
  fuzzy_name: 0.7,
  dob: 0.6,
  gender: 0.1,
  address_similarity: 0.5,
  pincode: 0.2,
};

/** Confidence bands for reporting. */
export type ConfidenceBand = "automatic" | "probable" | "fuzzy" | "low";
export function classifyConfidence(score: number): ConfidenceBand {
  if (score >= 0.9) return "automatic";
  if (score >= 0.7) return "probable";
  if (score >= 0.45) return "fuzzy";
  return "low";
}

export interface EngineResult {
  score: number;                    // combined 0..1
  band: ConfidenceBand;
  contributions: Array<{
    code: string;
    weight: number;
    score: number;
    signals: Record<string, unknown>;
  }>;
  signals: Record<string, unknown>; // flat merged signal bag
}

export class DedupEngine {
  constructor(
    private readonly matchers: Matcher[] = defaultMatchers(),
    private readonly weights: Record<string, number> = DEFAULT_WEIGHTS,
  ) {}

  /**
   * Weighted-average of matcher scores over matchers that actually fired.
   * Non-firing matchers contribute nothing (numerator and denominator).
   */
  evaluate(a: PersonLike, b: PersonLike): EngineResult {
    let num = 0;
    let den = 0;
    const contributions: EngineResult["contributions"] = [];
    const signals: Record<string, unknown> = {};

    for (const m of this.matchers) {
      const out = m.evaluate(a, b);
      if (!out.matched) continue;
      const w = this.weights[m.code] ?? 0;
      if (w <= 0) continue;
      num += out.score * w;
      den += w;
      contributions.push({ code: m.code, weight: w, score: out.score, signals: out.signals });
      for (const [k, v] of Object.entries(out.signals)) signals[k] = v;
    }

    const score = den > 0 ? num / den : 0;
    return { score, band: classifyConfidence(score), contributions, signals };
  }
}

/** Load weight overrides for a tenant from `platform_settings`. */
export async function loadWeights(
  // biome-ignore lint/suspicious/noExplicitAny: SB client
  sb: any,
  tenantId: string,
): Promise<Record<string, number>> {
  const { data } = await sb
    .from("platform_settings")
    .select("value")
    .eq("tenant_id", tenantId)
    .eq("key", "dedup.weights")
    .maybeSingle();
  const override = (data?.value ?? {}) as Record<string, unknown>;
  const merged: Record<string, number> = { ...DEFAULT_WEIGHTS };
  for (const [k, v] of Object.entries(override)) {
    if (typeof v === "number" && Number.isFinite(v) && v >= 0) merged[k] = v;
  }
  return merged;
}

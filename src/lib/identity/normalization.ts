/**
 * Master Person Registry — Normalization helpers (client-safe).
 *
 * Extends `validators.ts` with normalization used by the deduplication
 * engine: names, addresses, and small string-similarity utilities. Kept
 * pure so matchers can be unit-tested without a database.
 */

const SALUTATIONS = new Set([
  "mr", "mrs", "ms", "miss", "mx", "dr", "prof", "shri", "smt", "sri", "kum",
]);
const NAME_STRIP = /[^\p{L}\p{N}\s]/gu;

/** Normalize a person name for comparison: lowercase, strip punctuation,
 *  drop salutations, collapse whitespace. */
export function normalizeName(input: string | null | undefined): string {
  if (!input) return "";
  const cleaned = String(input)
    .toLowerCase()
    .replace(NAME_STRIP, " ")
    .replace(/\s+/g, " ")
    .trim();
  const tokens = cleaned.split(" ").filter((t) => t && !SALUTATIONS.has(t));
  return tokens.join(" ");
}

/** Split a normalized name into its token set. */
export function nameTokens(input: string | null | undefined): string[] {
  const n = normalizeName(input);
  return n ? n.split(" ") : [];
}

/** Normalize an address blob (line1+city+state+pincode) for comparison. */
export function normalizeAddress(parts: {
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  pincode?: string | null;
}): string {
  const joined = [parts.line1, parts.line2, parts.city, parts.state, parts.country, parts.pincode]
    .filter((v) => typeof v === "string" && v.trim().length > 0)
    .join(" ")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  return joined;
}

/** Normalize a PIN/ZIP code: digits only. */
export function normalizePincode(input: string | null | undefined): string {
  if (!input) return "";
  return String(input).replace(/\D+/g, "");
}

// ---------- String similarity ----------

/** Levenshtein edit distance (iterative, O(n·m) time, O(min(n,m)) space). */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  if (a.length < b.length) [a, b] = [b, a];
  const prev = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    let last = i - 1;
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, last + cost);
      last = tmp;
    }
  }
  return prev[b.length];
}

/** Normalized similarity in [0, 1] based on Levenshtein distance. */
export function similarity(a: string, b: string): number {
  if (!a && !b) return 1;
  if (!a || !b) return 0;
  const maxLen = Math.max(a.length, b.length);
  return 1 - levenshtein(a, b) / maxLen;
}

/** Jaccard similarity over token sets (order-independent name compare). */
export function tokenJaccard(a: string[], b: string[]): number {
  if (a.length === 0 && b.length === 0) return 1;
  if (a.length === 0 || b.length === 0) return 0;
  const sa = new Set(a);
  const sb = new Set(b);
  let inter = 0;
  for (const t of sa) if (sb.has(t)) inter++;
  const union = sa.size + sb.size - inter;
  return union === 0 ? 0 : inter / union;
}

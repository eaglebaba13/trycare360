/**
 * Server-only helpers for identity: national ID hashing + event emission.
 * Kept off the client bundle via the *.server.ts naming convention.
 */
import { createHash } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/**
 * Hash a raw national/government ID for storage in `persons.national_id_hash`.
 * Uses SHA-256 with an application-wide pepper (env: IDENTITY_HASH_PEPPER)
 * so hashes cannot be pre-computed offline. Input is trimmed + uppercased
 * so cosmetic variance (spaces, case) collapses to the same hash.
 */
export function hashNationalId(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const norm = String(raw).replace(/\s+/g, "").toUpperCase();
  if (!norm) return null;
  const pepper = process.env.IDENTITY_HASH_PEPPER ?? "trycare360-identity-v1";
  return createHash("sha256").update(`${pepper}:${norm}`).digest("hex");
}

/**
 * Identity domain events. Kept as a closed union so misuse is a type error.
 */
export type IdentityEventType =
  | "person.created"
  | "person.updated"
  | "person.archived"
  | "patient.created"
  | "role.attached"
  | "role.detached";

/**
 * Emit an identity domain event via the automation event bus.
 * Failures are swallowed and logged; event delivery must never break the
 * write path that produced the event.
 */
export async function emitIdentityEvent(
  supabase: SupabaseClient<Database>,
  args: {
    tenantId: string;
    eventType: IdentityEventType;
    payload?: Record<string, unknown>;
    entityRef?: Record<string, unknown> | null;
  },
): Promise<void> {
  try {
    await supabase.rpc("emit_automation_event", {
      _tenant_id: args.tenantId,
      _event_type: args.eventType,
      _payload: (args.payload ?? {}) as never,
      _entity_ref: (args.entityRef ?? null) as never,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("[identity] emit event failed", args.eventType, err);
  }
}

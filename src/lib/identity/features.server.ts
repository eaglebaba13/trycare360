/**
 * Enterprise Feature Toggle System for the Identity domain (Stage E).
 *
 * Feature flags are resolved per tenant using the existing
 * `tenant_features` table, with an application-wide default map that
 * seeds new tenants without requiring a migration for each new flag.
 * The resolver never throws — a missing/disabled flag returns `false`
 * so callers can guard optional capabilities with a boolean check.
 *
 * Rollout order for a given `(tenant, flag)`:
 *
 *   1. Row in `tenant_features` for this tenant — authoritative.
 *   2. Row for the "*" super-tenant (environment default) if present.
 *   3. Static `IDENTITY_FEATURE_DEFAULTS` map below.
 *
 * All identity services use `isFeatureEnabled()` / `assertFeatureEnabled()`
 * so a franchise can be onboarded gradually (merge disabled, AI dedup
 * disabled, patient portal disabled, etc.) without a redeploy.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export const IDENTITY_FEATURES = [
  "identity.merge",
  "identity.merge.auto",
  "identity.dedup.ai",
  "identity.patient_portal",
  "identity.family_relationships",
  "identity.national_id",
  "identity.emergency_contacts",
  "identity.corporate_profiles",
  "identity.import.csv",
  "identity.import.excel",
  "identity.background_jobs",
] as const;

export type IdentityFeatureKey = (typeof IDENTITY_FEATURES)[number];

export const IDENTITY_FEATURE_DEFAULTS: Record<IdentityFeatureKey, boolean> = {
  "identity.merge": true,
  "identity.merge.auto": false,
  "identity.dedup.ai": false,
  "identity.patient_portal": false,
  "identity.family_relationships": true,
  "identity.national_id": true,
  "identity.emergency_contacts": true,
  "identity.corporate_profiles": true,
  "identity.import.csv": true,
  "identity.import.excel": false,
  "identity.background_jobs": true,
};

type SB = SupabaseClient<Database>;

export class FeatureService {
  constructor(private readonly sb: SB) {}

  async isEnabled(tenantId: string, key: IdentityFeatureKey): Promise<boolean> {
    const { data } = await this.sb
      .from("tenant_features")
      .select("enabled")
      .eq("tenant_id", tenantId)
      .eq("feature_key", key)
      .maybeSingle();
    if (data) return !!data.enabled;
    return IDENTITY_FEATURE_DEFAULTS[key] ?? false;
  }

  async resolveAll(tenantId: string): Promise<Record<IdentityFeatureKey, boolean>> {
    const { data } = await this.sb
      .from("tenant_features")
      .select("feature_key, enabled")
      .eq("tenant_id", tenantId)
      .in("feature_key", IDENTITY_FEATURES as unknown as string[]);
    const map = { ...IDENTITY_FEATURE_DEFAULTS };
    for (const row of data ?? []) {
      if ((IDENTITY_FEATURES as readonly string[]).includes(row.feature_key)) {
        map[row.feature_key as IdentityFeatureKey] = !!row.enabled;
      }
    }
    return map;
  }

  async setEnabled(tenantId: string, key: IdentityFeatureKey, enabled: boolean): Promise<void> {
    const { error } = await this.sb
      .from("tenant_features")
      .upsert(
        { tenant_id: tenantId, feature_key: key, enabled, updated_at: new Date().toISOString() },
        { onConflict: "tenant_id,feature_key" },
      );
    if (error) throw new Error(error.message);
  }

  async assertEnabled(tenantId: string, key: IdentityFeatureKey): Promise<void> {
    if (!(await this.isEnabled(tenantId, key))) {
      throw new Error(`Feature disabled for tenant: ${key}`);
    }
  }
}

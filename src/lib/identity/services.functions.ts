/**
 * Identity Services — Server Function surface (Stage E).
 *
 * Thin `createServerFn` wrappers that expose the service layer, search,
 * timeline, patient summary, health check, import/export, feature
 * toggles, and background jobs to the client. Business logic lives in
 * the .server.ts modules; these handlers only:
 *
 *   1. Enforce authentication via `requireSupabaseAuth`.
 *   2. Validate input with Zod.
 *   3. Delegate to the appropriate service.
 *
 * No UI is imported here; consumption in Stage F happens via
 * `useServerFn(...)` and TanStack Query.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { IDENTITY_FEATURES } from "./features.server";

const tenantId = z.string().uuid();
const personId = z.string().uuid();

// ---------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------

const quickSearchSchema = z.object({
  tenant_id: tenantId,
  query: z.string().min(1),
  limit: z.number().int().min(1).max(50).optional(),
});

export const quickSearchPersons = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => quickSearchSchema.parse(d))
  .handler(async ({ context, data }) => {
    const { SearchService } = await import("./search.server");
    const svc = new SearchService(context.supabase);
    return svc.quickSearch(data.tenant_id, data.query, data.limit ?? 10);
  });

const advancedSearchSchema = z.object({
  tenant_id: tenantId,
  query: z.string().optional(),
  role: z
    .enum([
      "patient",
      "doctor",
      "employee",
      "franchise_owner",
      "academy_student",
      "lead",
      "corporate_contact",
      "vendor_contact",
    ])
    .optional(),
  branch_id: z.string().uuid().optional(),
  city: z.string().optional(),
  tag_def_id: z.string().uuid().optional(),
  identity_status: z.enum(["active", "archived", "merged"]).optional(),
  consent_purpose_code: z.string().optional(),
  consent_granted: z.boolean().optional(),
  verified: z.boolean().optional(),
  membership_tier: z.string().optional(),
  doctor_id: z.string().uuid().optional(),
  franchise_id: z.string().uuid().optional(),
  employee_department_id: z.string().uuid().optional(),
  limit: z.number().int().min(1).max(500).optional(),
  offset: z.number().int().min(0).optional(),
});

export const advancedSearchPersons = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => advancedSearchSchema.parse(d))
  .handler(async ({ context, data }) => {
    const { SearchService } = await import("./search.server");
    const svc = new SearchService(context.supabase);
    return svc.advancedSearch({
      tenantId: data.tenant_id,
      query: data.query,
      role: data.role,
      branchId: data.branch_id,
      city: data.city,
      tagDefId: data.tag_def_id,
      identityStatus: data.identity_status,
      consentPurposeCode: data.consent_purpose_code,
      consentGranted: data.consent_granted,
      verified: data.verified,
      membershipTier: data.membership_tier,
      doctorId: data.doctor_id,
      franchiseId: data.franchise_id,
      employeeDepartmentId: data.employee_department_id,
      limit: data.limit,
      offset: data.offset,
    });
  });

// ---------------------------------------------------------------------
// Timeline / Summary
// ---------------------------------------------------------------------

export const getPersonTimeline = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({ tenant_id: tenantId, person_id: personId, limit: z.number().int().min(1).max(500).optional() })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { TimelineService } = await import("./timeline.server");
    return new TimelineService(context.supabase).forPerson(
      data.tenant_id,
      data.person_id,
      data.limit ?? 100,
    );
  });

export const getPatientSummaryFull = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ tenant_id: tenantId, person_id: personId }).parse(d))
  .handler(async ({ context, data }) => {
    const { SummaryService } = await import("./summary.server");
    return new SummaryService(context.supabase).patientSummary(data.tenant_id, data.person_id);
  });

// ---------------------------------------------------------------------
// Feature toggles
// ---------------------------------------------------------------------

const featureKeySchema = z.enum(IDENTITY_FEATURES as unknown as [string, ...string[]]);

export const listIdentityFeatures = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ tenant_id: tenantId }).parse(d))
  .handler(async ({ context, data }) => {
    const { FeatureService } = await import("./features.server");
    return new FeatureService(context.supabase).resolveAll(data.tenant_id);
  });

export const setIdentityFeature = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ tenant_id: tenantId, key: featureKeySchema, enabled: z.boolean() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { FeatureService } = await import("./features.server");
    // biome-ignore lint/suspicious/noExplicitAny: enum widened
    await new FeatureService(context.supabase).setEnabled(data.tenant_id, data.key as any, data.enabled);
    return { ok: true };
  });

// ---------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------

export const runIdentityHealthCheck = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ tenant_id: tenantId }).parse(d))
  .handler(async ({ context, data }) => {
    const { HealthCheckService } = await import("./health.server");
    return new HealthCheckService(context.supabase).run(data.tenant_id);
  });

// ---------------------------------------------------------------------
// Import / Export
// ---------------------------------------------------------------------

export const previewCsvImport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ tenant_id: tenantId, csv: z.string().min(1) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { FeatureService } = await import("./features.server");
    await new FeatureService(context.supabase).assertEnabled(data.tenant_id, "identity.import.csv");
    const { ImportService, parseCsv } = await import("./importExport.server");
    const { headers, rows } = parseCsv(data.csv);
    const svc = new ImportService(context.supabase);
    return svc.preview(data.tenant_id, headers, rows);
  });

export const commitCsvImport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        tenant_id: tenantId,
        csv: z.string().min(1),
        skip_duplicates: z.boolean().optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { FeatureService } = await import("./features.server");
    await new FeatureService(context.supabase).assertEnabled(data.tenant_id, "identity.import.csv");
    const { ImportService, parseCsv } = await import("./importExport.server");
    const { makeIdentityServices } = await import("./services.server");
    const { headers, rows } = parseCsv(data.csv);
    const importer = new ImportService(context.supabase);
    const services = makeIdentityServices(context.supabase);
    const { report, normalized } = await importer.preview(data.tenant_id, headers, rows);
    const skipDup = data.skip_duplicates ?? true;

    const created: string[] = [];
    const skipped: number[] = [];
    const errors: Array<{ row: number; message: string }> = [];
    const invalidRows = new Set(report.issues.map((i) => i.row));
    const dupRows = new Set(report.sample_duplicates.map((d) => d.row));

    for (const r of normalized) {
      if (invalidRows.has(r.row)) {
        skipped.push(r.row);
        continue;
      }
      if (skipDup && dupRows.has(r.row)) {
        skipped.push(r.row);
        continue;
      }
      try {
        const { person } = await services.persons.create({
          tenant_id: r.tenant_id,
          full_name: r.full_name,
          phone: r.phone_e164 ?? undefined,
          email: r.email_normalized ?? undefined,
          dob: r.dob ?? undefined,
          gender: r.gender as never,
        });
        created.push(person.id);
      } catch (e) {
        errors.push({ row: r.row, message: (e as Error).message });
      }
    }

    return { report, created: created.length, skipped: skipped.length, errors };
  });

export const exportPersonsCsv = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ tenant_id: tenantId, limit: z.number().int().min(1).max(50_000).optional() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { ExportService } = await import("./importExport.server");
    const csv = await new ExportService(context.supabase).personsCsv(data.tenant_id, data.limit ?? 10_000);
    return { csv, filename: `persons-${data.tenant_id}-${new Date().toISOString().slice(0, 10)}.csv` };
  });

// ---------------------------------------------------------------------
// Background jobs (admin-triggered)
// ---------------------------------------------------------------------

const jobInputSchema = z.object({
  tenant_id: tenantId,
  batch: z.number().int().min(1).max(5000).optional(),
  since_hours: z.number().int().min(1).max(720).optional(),
});

export const runNightlyDuplicateScan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => jobInputSchema.parse(d))
  .handler(async ({ context, data }) => {
    const { FeatureService } = await import("./features.server");
    await new FeatureService(context.supabase).assertEnabled(data.tenant_id, "identity.background_jobs");
    const { nightlyDuplicateScan } = await import("./jobs.server");
    return nightlyDuplicateScan(context.supabase, data.tenant_id, {
      batch: data.batch,
      sinceHours: data.since_hours,
    });
  });

export const runRebuildSearchIndex = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => jobInputSchema.parse(d))
  .handler(async ({ context, data }) => {
    const { FeatureService } = await import("./features.server");
    await new FeatureService(context.supabase).assertEnabled(data.tenant_id, "identity.background_jobs");
    const { rebuildSearchIndex } = await import("./jobs.server");
    return rebuildSearchIndex(context.supabase, data.tenant_id, {
      batch: data.batch,
      sinceHours: data.since_hours,
    });
  });

export const runRebuildPersonCache = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => jobInputSchema.parse(d))
  .handler(async ({ context, data }) => {
    const { FeatureService } = await import("./features.server");
    await new FeatureService(context.supabase).assertEnabled(data.tenant_id, "identity.background_jobs");
    const { rebuildPersonCache } = await import("./jobs.server");
    return rebuildPersonCache(context.supabase, data.tenant_id, { batch: data.batch });
  });

export const runIdentityHealthReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ tenant_id: tenantId }).parse(d))
  .handler(async ({ context, data }) => {
    const { FeatureService } = await import("./features.server");
    await new FeatureService(context.supabase).assertEnabled(data.tenant_id, "identity.background_jobs");
    const { healthReport } = await import("./jobs.server");
    return healthReport(context.supabase, data.tenant_id);
  });

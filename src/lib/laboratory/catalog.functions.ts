/**
 * Laboratory — test catalog, panels, reference ranges, delta / critical rules.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  catalogListSchema,
  criticalRuleUpsertSchema,
  deltaCheckUpsertSchema,
  panelUpsertSchema,
  referenceRangeUpsertSchema,
  testUpsertSchema,
} from "./validators";
import {
  CriticalValueRepository,
  DeltaCheckRepository,
  PanelRepository,
  ReferenceRangeRepository,
  TestCatalogRepository,
} from "./repositories.server";

export const listTests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => catalogListSchema.parse(d))
  .handler(async ({ context, data }) => {
    const repo = new TestCatalogRepository(context.supabase);
    return { rows: await repo.list(data) };
  });

export const upsertTest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => testUpsertSchema.parse(d))
  .handler(async ({ context, data }) => {
    const repo = new TestCatalogRepository(context.supabase);
    const row = {
      id: data.id,
      tenant_id: data.tenantId,
      code: data.code,
      name: data.name,
      short_name: data.shortName ?? null,
      loinc_code: data.loincCode ?? null,
      cpt_code: data.cptCode ?? null,
      department_id: data.departmentId ?? null,
      sample_type_id: data.sampleTypeId ?? null,
      container_type_id: data.containerTypeId ?? null,
      analyzer_type_id: data.analyzerTypeId ?? null,
      unit_id: data.unitId ?? null,
      method: data.method ?? null,
      result_kind: data.resultKind,
      tat_minutes: data.tatMinutes ?? null,
      price: data.price ?? null,
      is_reflex: data.isReflex ?? false,
      reflex_config: (data.reflexConfig ?? {}) as never,
      requires_approval: data.requiresApproval ?? false,
      is_active: data.isActive ?? true,
      meta: (data.meta ?? {}) as never,
      updated_by: context.userId,
    };
    return {
      test: data.id ? await repo.update(data.id, row) : await repo.insert({ ...row, created_by: context.userId }),
    };
  });

export const listPanels = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => catalogListSchema.parse(d))
  .handler(async ({ context, data }) => {
    const repo = new PanelRepository(context.supabase);
    return { rows: await repo.list(data) };
  });

export const upsertPanel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => panelUpsertSchema.parse(d))
  .handler(async ({ context, data }) => {
    const repo = new PanelRepository(context.supabase);
    const header = data.id
      ? await repo.update(data.id, {
          code: data.code,
          name: data.name,
          department_id: data.departmentId ?? null,
          price: data.price ?? null,
          is_active: data.isActive ?? true,
          meta: (data.meta ?? {}) as never,
          updated_by: context.userId,
        })
      : await repo.insert({
          tenant_id: data.tenantId,
          code: data.code,
          name: data.name,
          department_id: data.departmentId ?? null,
          price: data.price ?? null,
          is_active: data.isActive ?? true,
          meta: (data.meta ?? {}) as never,
          created_by: context.userId,
          updated_by: context.userId,
        });
    const tests = await repo.replaceTests(
      data.tenantId,
      header.id,
      data.tests.map((t) => ({
        tenant_id: data.tenantId,
        panel_id: header.id,
        test_id: t.testId,
        sequence: t.sequence,
        is_optional: t.isOptional,
      })),
    );
    return { panel: header, tests };
  });

export const upsertReferenceRange = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => referenceRangeUpsertSchema.parse(d))
  .handler(async ({ context, data }) => {
    const repo = new ReferenceRangeRepository(context.supabase);
    return {
      range: await repo.upsert({
        id: data.id,
        tenant_id: data.tenantId,
        test_id: data.testId,
        unit_id: data.unitId ?? null,
        range_type: data.rangeType,
        sex: data.sex ?? null,
        age_min_days: data.ageMinDays ?? null,
        age_max_days: data.ageMaxDays ?? null,
        condition: data.condition ?? null,
        low_value: data.lowValue ?? null,
        high_value: data.highValue ?? null,
        qualitative_expected: data.qualitativeExpected ?? null,
        is_active: data.isActive ?? true,
        meta: (data.meta ?? {}) as never,
      }),
    };
  });

export const upsertDeltaCheck = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => deltaCheckUpsertSchema.parse(d))
  .handler(async ({ context, data }) => {
    const repo = new DeltaCheckRepository(context.supabase);
    return {
      rule: await repo.upsert({
        id: data.id,
        tenant_id: data.tenantId,
        test_id: data.testId,
        delta_kind: data.deltaKind,
        threshold: data.threshold,
        window_days: data.windowDays,
        action: data.action,
        is_active: data.isActive ?? true,
      }),
    };
  });

export const upsertCriticalRule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => criticalRuleUpsertSchema.parse(d))
  .handler(async ({ context, data }) => {
    const repo = new CriticalValueRepository(context.supabase);
    return {
      rule: await repo.upsert({
        id: data.id,
        tenant_id: data.tenantId,
        test_id: data.testId,
        low_critical: data.lowCritical ?? null,
        high_critical: data.highCritical ?? null,
        qualitative_critical: data.qualitativeCritical ?? null,
        ack_required: data.ackRequired,
        ack_window_minutes: data.ackWindowMinutes,
        notify_channels: (data.notifyChannels ?? {}) as never,
        is_active: data.isActive ?? true,
      }),
    };
  });

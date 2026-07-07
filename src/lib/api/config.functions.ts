/**
 * Configuration Module — generic, whitelisted CRUD for all master/config tables.
 * New masters can be added by inserting a row in `master_types` — no code change.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// Whitelist of tables the generic CRUD is allowed to touch.
export const CONFIG_TABLES = [
  "master_types",
  "masters",
  "countries",
  "states",
  "districts",
  "cities",
  "areas",
  "pincodes",
  "companies",
  "brands",
  "gst_registrations",
  "bank_accounts",
  "company_addresses",
  "branches",
  "global_settings",
  "platform_settings",
] as const;
export type ConfigTable = (typeof CONFIG_TABLES)[number];

const tableEnum = z.enum(CONFIG_TABLES);

const filterSchema = z.object({
  table: tableEnum,
  filters: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
  orderBy: z
    .object({
      column: z.string(),
      ascending: z.boolean().optional(),
    })
    .optional(),
  limit: z.number().int().positive().max(1000).optional(),
});

export const listRows = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => filterSchema.parse(d))
  .handler(async ({ context, data }) => {
    let q = context.supabase.from(data.table).select("*");
    if (data.filters) {
      for (const [k, v] of Object.entries(data.filters)) {
        q = v === null ? q.is(k, null) : q.eq(k, v);
      }
    }
    if (data.orderBy) q = q.order(data.orderBy.column, { ascending: data.orderBy.ascending ?? true });
    if (data.limit) q = q.limit(data.limit);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

const upsertSchema = z.object({
  table: tableEnum,
  row: z.record(z.string(), z.unknown()),
  onConflict: z.string().optional(),
});

export const upsertRow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => upsertSchema.parse(d))
  .handler(async ({ context, data }) => {
    const { data: row, error } = await context.supabase
      .from(data.table)
      // biome-ignore lint/suspicious/noExplicitAny: generic table access
      .upsert(data.row as any, data.onConflict ? { onConflict: data.onConflict } : undefined)
      .select()
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

const deleteSchema = z.object({
  table: tableEnum,
  id: z.union([z.string(), z.number()]),
  idColumn: z.string().default("id"),
});

export const deleteRow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => deleteSchema.parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from(data.table).delete().eq(data.idColumn, data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Convenience: fetch master values by type_code for dropdowns anywhere in the app.
export const listMastersByType = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ typeCode: z.string(), tenantId: z.string().uuid().optional() }).parse(d))
  .handler(async ({ context, data }) => {
    let q = context.supabase
      .from("masters")
      .select("id, code, name, parent_id, display_order, is_active, meta, color, icon")
      .eq("type_code", data.typeCode)
      .eq("is_active", true)
      .order("display_order", { ascending: true });
    if (data.tenantId) q = q.or(`tenant_id.eq.${data.tenantId},tenant_id.is.null`);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

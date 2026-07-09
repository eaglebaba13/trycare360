/**
 * Stage D — Merge & Unmerge server functions.
 *
 * All merge/unmerge logic lives in SECURITY DEFINER Postgres functions
 * (`person_merge_validate` / `_preview` / `_execute` / `_unmerge`). These
 * TypeScript wrappers only:
 *   1. validate input with Zod,
 *   2. enforce authenticated calls (RLS + function EXECUTE grant),
 *   3. record the merge request row when relevant,
 *   4. hand off to the RPC and return its JSON result.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const uuid = z.string().uuid();

// -----------------------------------------------------------------------
// Types returned by the RPCs (kept loose; the DB is the source of truth).
// -----------------------------------------------------------------------

// JSON-safe value type used across RPC return shapes so TanStack's
// serializer accepts them across the RPC boundary.
type Json = string | number | boolean | null | { [k: string]: Json } | Json[];
type JsonObj = { [k: string]: Json };

export type MergeValidation = {
  ok: boolean;
  errors: string[];
  source: JsonObj | null;
  target: JsonObj | null;
};

export type MergePreview = {
  dry_run: true;
  blocked: boolean;
  validation: MergeValidation;
  tenant_id?: string;
  source_id?: string;
  target_id?: string;
  per_table?: Array<{
    schema: string;
    table: string;
    column: string;
    candidate_count: number;
    ancillary?: boolean;
  }>;
  total_affected_rows?: number;
  warnings?: string[];
  rollback_supported?: boolean;
  estimated_ms?: number;
};

export type MergeExecuteResult = {
  ok: true;
  history_id: string;
  source_id: string;
  target_id: string;
  tenant_id: string;
  fk_summary: JsonObj[];
  execution_ms: number;
};

export type UnmergeResult = {
  ok: true;
  history_id: string;
  restored_updates: number;
  reinserted_rows: number;
  warnings: string[];
  execution_ms: number;
};

// -----------------------------------------------------------------------
// Schemas
// -----------------------------------------------------------------------

const pairSchema = z.object({ source_id: uuid, target_id: uuid })
  .refine((v) => v.source_id !== v.target_id, {
    message: "source_id and target_id must differ",
    path: ["target_id"],
  });

const requestCreateSchema = z.object({
  tenant_id: uuid,
  source_id: uuid,
  target_id: uuid,
  reason: z.string().trim().max(500).nullish(),
}).refine((v) => v.source_id !== v.target_id, {
  message: "source_id and target_id must differ",
  path: ["target_id"],
});

const executeSchema = z.object({
  source_id: uuid,
  target_id: uuid,
  request_id: uuid.optional(),
  reason: z.string().trim().max(500).nullish(),
}).refine((v) => v.source_id !== v.target_id, {
  message: "source_id and target_id must differ",
  path: ["target_id"],
});

const unmergeSchema = z.object({
  history_id: uuid,
  reason: z.string().trim().max(500).nullish(),
});

const listHistorySchema = z.object({
  tenant_id: uuid,
  person_id: uuid.optional(),
  limit: z.number().int().positive().max(100).default(25),
  offset: z.number().int().min(0).default(0),
});

// -----------------------------------------------------------------------
// Validate
// -----------------------------------------------------------------------

export const validateMerge = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => pairSchema.parse(d))
  .handler(async ({ context, data }): Promise<MergeValidation> => {
    const { data: res, error } = await context.supabase.rpc("person_merge_validate", {
      _source_id: data.source_id,
      _target_id: data.target_id,
    });
    if (error) throw new Error(error.message);
    return res as MergeValidation;
  });

// -----------------------------------------------------------------------
// Dry-run preview
// -----------------------------------------------------------------------

export const previewMerge = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => pairSchema.parse(d))
  .handler(async ({ context, data }): Promise<MergePreview> => {
    const { data: res, error } = await context.supabase.rpc("person_merge_preview", {
      _source_id: data.source_id,
      _target_id: data.target_id,
    });
    if (error) throw new Error(error.message);
    return res as MergePreview;
  });

// -----------------------------------------------------------------------
// Merge request lifecycle
// -----------------------------------------------------------------------

export const createMergeRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => requestCreateSchema.parse(d))
  .handler(async ({ context, data }) => {
    const { data: row, error } = await context.supabase
      .from("person_merge_requests")
      .insert({
        tenant_id: data.tenant_id,
        source_person_id: data.source_id,
        target_person_id: data.target_id,
        reason: data.reason ?? null,
        status: "pending",
        requested_by: context.userId,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return { request: row };
  });

export const listMergeRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      tenant_id: uuid,
      status: z.enum(["pending", "approved", "rejected", "executed", "cancelled"]).optional(),
      limit: z.number().int().positive().max(100).default(25),
      offset: z.number().int().min(0).default(0),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    let q = context.supabase
      .from("person_merge_requests")
      .select("*", { count: "exact" })
      .eq("tenant_id", data.tenant_id)
      .order("created_at", { ascending: false })
      .range(data.offset, data.offset + data.limit - 1);
    if (data.status) q = q.eq("status", data.status);
    const { data: rows, error, count } = await q;
    if (error) throw new Error(error.message);
    return { rows: rows ?? [], total: count ?? 0 };
  });

// -----------------------------------------------------------------------
// Execute merge (calls SECURITY DEFINER RPC in a single transaction)
// -----------------------------------------------------------------------

export const executeMerge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => executeSchema.parse(d))
  .handler(async ({ context, data }): Promise<MergeExecuteResult> => {
    const { data: res, error } = await context.supabase.rpc("person_merge_execute", {
      _source_id: data.source_id,
      _target_id: data.target_id,
      _request_id: data.request_id ?? undefined,
      _reason: data.reason ?? undefined,
    });
    if (error) throw new Error(error.message);
    return res as MergeExecuteResult;
  });

// -----------------------------------------------------------------------
// Unmerge (rollback a specific history entry)
// -----------------------------------------------------------------------

export const unmergePerson = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => unmergeSchema.parse(d))
  .handler(async ({ context, data }): Promise<UnmergeResult> => {
    const { data: res, error } = await context.supabase.rpc("person_merge_unmerge", {
      _history_id: data.history_id,
      _reason: data.reason ?? undefined,
    });
    if (error) throw new Error(error.message);
    return res as UnmergeResult;
  });

// -----------------------------------------------------------------------
// History listing (audit trail)
// -----------------------------------------------------------------------

export const listMergeHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => listHistorySchema.parse(d))
  .handler(async ({ context, data }) => {
    let q = context.supabase
      .from("person_merge_history")
      .select("*", { count: "exact" })
      .eq("tenant_id", data.tenant_id)
      .order("performed_at", { ascending: false })
      .range(data.offset, data.offset + data.limit - 1);
    if (data.person_id) {
      q = q.or(`source_person_id.eq.${data.person_id},target_person_id.eq.${data.person_id}`);
    }
    const { data: rows, error, count } = await q;
    if (error) throw new Error(error.message);
    return { rows: rows ?? [], total: count ?? 0 };
  });

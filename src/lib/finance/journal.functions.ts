/**
 * Journal server functions.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  journalCreateSchema,
  journalIdSchema,
  journalListSchema,
  journalReverseSchema,
} from "./validators";
import { JournalEngine } from "./engines/journal.engine.server";
import { JournalLineRepository, JournalRepository } from "./repositories.server";

export const createJournal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => journalCreateSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new JournalEngine(context.supabase);
    return { journal: await engine.create(data, context.userId) };
  });

export const postJournal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => journalIdSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new JournalEngine(context.supabase);
    return { journal: await engine.post(data, context.userId) };
  });

export const reverseJournal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => journalReverseSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new JournalEngine(context.supabase);
    return { reversal: await engine.reverse(data, context.userId) };
  });

export const voidJournal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => journalIdSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new JournalEngine(context.supabase);
    return { journal: await engine.voidEntry(data, context.userId) };
  });

export const listJournalEntries = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => journalListSchema.parse(d))
  .handler(async ({ context, data }) => {
    const repo = new JournalRepository(context.supabase);
    return { rows: await repo.list(data) };
  });

export const getJournal = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => journalIdSchema.parse(d))
  .handler(async ({ context, data }) => {
    const journals = new JournalRepository(context.supabase);
    const lines = new JournalLineRepository(context.supabase);
    const entry = await journals.getById(data.journalId);
    if (!entry || entry.tenant_id !== data.tenantId) throw new Error("Not found");
    return { entry, lines: await lines.listByEntry(entry.id) };
  });

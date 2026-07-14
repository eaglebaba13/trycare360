/**
 * Patient Portal — Documents server functions.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { DocumentsEngine } from "./engines/documents.engine.server";
import {
  createFolderSchema,
  emptySchema,
  listDocumentsSchema,
  savePrescriptionSchema,
  saveReportSchema,
  signedUrlSchema,
} from "./validators";

export const listMyDocuments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => listDocumentsSchema.parse(d ?? {}))
  .handler(async ({ context, data }) => {
    const engine = new DocumentsEngine(context.supabase);
    return { rows: await engine.list(context.userId, data) };
  });

export const listMyDocumentFolders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => emptySchema.parse(d ?? {}))
  .handler(async ({ context }) => {
    const engine = new DocumentsEngine(context.supabase);
    return { rows: await engine.listFolders(context.userId) };
  });

export const createDocumentFolder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => createFolderSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new DocumentsEngine(context.supabase);
    return { folder: await engine.createFolder(context.userId, data) };
  });

export const saveReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => saveReportSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new DocumentsEngine(context.supabase);
    return { row: await engine.saveReport(context.userId, data) };
  });

export const savePrescription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => savePrescriptionSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new DocumentsEngine(context.supabase);
    return { row: await engine.savePrescription(context.userId, data) };
  });

export const getDocumentSignedUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => signedUrlSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new DocumentsEngine(context.supabase);
    return await engine.getSignedUrl(context.userId, data);
  });

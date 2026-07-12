/**
 * Fixed asset server functions.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  assetDepreciationSchema,
  assetDisposeSchema,
  assetListSchema,
  assetRegisterSchema,
} from "./validators";
import { AssetEngine } from "./engines/asset.engine.server";
import {
  DepreciationRepository,
  FixedAssetRepository,
} from "./repositories.server";

export const registerAsset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => assetRegisterSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new AssetEngine(context.supabase);
    return { asset: await engine.register(data, context.userId) };
  });

export const postDepreciation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => assetDepreciationSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new AssetEngine(context.supabase);
    return { schedule: await engine.postDepreciation(data, context.userId) };
  });

export const disposeAsset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => assetDisposeSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new AssetEngine(context.supabase);
    return { asset: await engine.dispose(data, context.userId) };
  });

export const listAssets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => assetListSchema.parse(d))
  .handler(async ({ context, data }) => {
    const repo = new FixedAssetRepository(context.supabase);
    return { rows: await repo.list(data) };
  });

export const listDepreciationSchedule = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    assetDisposeSchema.partial({ disposedAt: true, disposalValue: true }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const repo = new DepreciationRepository(context.supabase);
    return { rows: await repo.listByAsset(data.assetId) };
  });

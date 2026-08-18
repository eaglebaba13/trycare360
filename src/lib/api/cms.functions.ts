/**
 * CMS Server Functions
 * Public loaders (unauthenticated) + admin CRUD (auth-gated) for the
 * enterprise CMS: pages, blog, doctors, treatments, franchise, academy,
 * products, menus, media, redirects, settings, appointment intake.
 *
 * Public reads use the anon publishable key + narrow "status='published'"
 * SELECT policies. Admin writes use requireSupabaseAuth + can_manage_cms().
 */
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database, Json } from "@/integrations/supabase/types";

// ---------- Public client (server-side, anon key) ----------
function publicClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

// ---------- Shared types ----------
export type CmsStatus = "draft" | "scheduled" | "published" | "archived";
export type CmsBlock = { id: string; type: string; data: Record<string, unknown> };

// =====================================================================
// PUBLIC LOADERS (anon)
// =====================================================================

export const getSiteSettings = createServerFn({ method: "GET" }).handler(async () => {
  const sb = publicClient();
  const { data } = await sb.from("cms_sites").select("*").eq("is_active", true).limit(1).maybeSingle();
  return data;
});

export const getMenu = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ location: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { data: row } = await sb
      .from("cms_navigation_menus")
      .select("*")
      .eq("location", data.location)
      .eq("is_active", true)
      .maybeSingle();
    return row;
  });

export const getPageByPath = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ path: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { data: row } = await sb
      .from("cms_pages")
      .select("*")
      .eq("path", data.path)
      .eq("status", "published")
      .maybeSingle();
    return row;
  });

export const listPublishedPosts = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) =>
    z
      .object({
        category: z.string().optional(),
        tag: z.string().optional(),
        limit: z.number().int().min(1).max(100).default(20),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data }) => {
    const sb = publicClient();
    let q = sb
      .from("cms_blog_posts")
      .select("id, slug, title, excerpt, cover_url, published_at, reading_minutes, author_id, category_id")
      .eq("status", "published")
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(data.limit);
    if (data.category) {
      const { data: cat } = await sb.from("cms_blog_categories").select("id").eq("slug", data.category).maybeSingle();
      if (cat) q = q.eq("category_id", cat.id);
    }
    const { data: rows } = await q;
    return rows ?? [];
  });

export const getPost = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ slug: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { data: post } = await sb
      .from("cms_blog_posts")
      .select("*")
      .eq("slug", data.slug)
      .eq("status", "published")
      .maybeSingle();
    if (!post) return null;
    const [{ data: author }, { data: category }] = await Promise.all([
      post.author_id
        ? sb.from("cms_blog_authors").select("id, name, avatar_url, bio, slug").eq("id", post.author_id).maybeSingle()
        : Promise.resolve({ data: null }),
      post.category_id
        ? sb.from("cms_blog_categories").select("id, name, slug").eq("id", post.category_id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
    return { ...post, author, category };
  });

export const listDoctors = createServerFn({ method: "GET" }).handler(async () => {
  const sb = publicClient();
  const { data } = await sb
    .from("cms_doctors")
    .select("id, slug, name, title, specialties, photo_url, years_experience, sort_order")
    .eq("status", "published")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  return data ?? [];
});

export const getDoctor = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ slug: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { data: row } = await sb
      .from("cms_doctors")
      .select("*")
      .eq("slug", data.slug)
      .eq("status", "published")
      .maybeSingle();
    return row;
  });

export const listTreatments = createServerFn({ method: "GET" }).handler(async () => {
  const sb = publicClient();
  const { data } = await sb
    .from("cms_treatments")
    .select("id, slug, name, category, summary, cover_url, price_from, price_currency, duration_minutes, sort_order")
    .eq("status", "published")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  return data ?? [];
});

export const getTreatment = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ slug: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { data: t } = await sb
      .from("cms_treatments")
      .select("*")
      .eq("slug", data.slug)
      .eq("status", "published")
      .maybeSingle();
    if (!t) return null;
    const { data: doctors } = await sb
      .from("cms_treatment_doctors")
      .select("doctor:cms_doctors(id, slug, name, title, photo_url, specialties)")
      .eq("treatment_id", t.id);
    return { ...t, doctors: (doctors ?? []).map((r) => r.doctor).filter(Boolean) };
  });

export const listFranchise = createServerFn({ method: "GET" }).handler(async () => {
  const sb = publicClient();
  const { data } = await sb
    .from("cms_franchise_offers")
    .select("*")
    .eq("status", "published")
    .order("sort_order", { ascending: true });
  return data ?? [];
});

export const getFranchise = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ slug: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { data: row } = await sb
      .from("cms_franchise_offers")
      .select("*")
      .eq("slug", data.slug)
      .eq("status", "published")
      .maybeSingle();
    return row;
  });

export const listCourses = createServerFn({ method: "GET" }).handler(async () => {
  const sb = publicClient();
  const { data } = await sb
    .from("cms_academy_courses")
    .select("*")
    .eq("status", "published")
    .order("sort_order", { ascending: true });
  return data ?? [];
});

export const getCourse = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ slug: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { data: row } = await sb
      .from("cms_academy_courses")
      .select("*")
      .eq("slug", data.slug)
      .eq("status", "published")
      .maybeSingle();
    return row;
  });

export const listProducts = createServerFn({ method: "GET" }).handler(async () => {
  const sb = publicClient();
  const { data } = await sb
    .from("cms_products")
    .select("*")
    .eq("status", "published")
    .order("sort_order", { ascending: true });
  return data ?? [];
});

export const getProduct = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ slug: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { data: row } = await sb
      .from("cms_products")
      .select("*")
      .eq("slug", data.slug)
      .eq("status", "published")
      .maybeSingle();
    return row;
  });

export const searchSite = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ q: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => {
    const sb = publicClient();
    const q = data.q;
    const [tr, dr, pr, br] = await Promise.all([
      sb.from("cms_treatments").select("slug, name, summary").eq("status", "published").ilike("name", `%${q}%`).limit(10),
      sb.from("cms_doctors").select("slug, name, title").eq("status", "published").ilike("name", `%${q}%`).limit(10),
      sb.from("cms_products").select("slug, name, short_description").eq("status", "published").ilike("name", `%${q}%`).limit(10),
      sb.from("cms_blog_posts").select("slug, title, excerpt").eq("status", "published").ilike("title", `%${q}%`).limit(10),
    ]);
    return {
      treatments: tr.data ?? [],
      doctors: dr.data ?? [],
      products: pr.data ?? [],
      posts: br.data ?? [],
    };
  });

export const listSitemapEntries = createServerFn({ method: "GET" }).handler(async () => {
  const sb = publicClient();
  const [pages, posts, doctors, treatments, franchise, courses, products] = await Promise.all([
    sb.from("cms_pages").select("path, updated_at").eq("status", "published"),
    sb.from("cms_blog_posts").select("slug, updated_at").eq("status", "published"),
    sb.from("cms_doctors").select("slug, updated_at").eq("status", "published"),
    sb.from("cms_treatments").select("slug, updated_at").eq("status", "published"),
    sb.from("cms_franchise_offers").select("slug, updated_at").eq("status", "published"),
    sb.from("cms_academy_courses").select("slug, updated_at").eq("status", "published"),
    sb.from("cms_products").select("slug, updated_at").eq("status", "published"),
  ]);
  return {
    pages: pages.data ?? [],
    posts: posts.data ?? [],
    doctors: doctors.data ?? [],
    treatments: treatments.data ?? [],
    franchise: franchise.data ?? [],
    courses: courses.data ?? [],
    products: products.data ?? [],
  };
});

// =====================================================================
// APPOINTMENT REQUEST (public write via server route; also exposed here)
// =====================================================================
export const submitAppointmentRequest = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        tenant_id: z.string().uuid(),
        full_name: z.string().min(2).max(120),
        phone: z.string().min(6).max(30),
        email: z.string().email().optional().or(z.literal("")),
        city: z.string().optional(),
        treatment_slug: z.string().optional(),
        doctor_slug: z.string().optional(),
        preferred_at: z.string().datetime().optional(),
        message: z.string().max(2000).optional(),
        source: z.string().optional(),
        utm: z.record(z.string(), z.string()).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Only accept requests for an active site of the given tenant.
    const { data: site } = await supabaseAdmin
      .from("cms_sites")
      .select("id")
      .eq("tenant_id", data.tenant_id)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();
    if (!site) throw new Error("Invalid request");

    // Basic abuse guard: cap submissions per phone per tenant per hour.
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await supabaseAdmin
      .from("cms_appointment_requests")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", data.tenant_id)
      .eq("phone", data.phone)
      .gte("created_at", since);
    if ((count ?? 0) >= 5) throw new Error("Too many requests, please try again later");

    const { data: row, error } = await supabaseAdmin
      .from("cms_appointment_requests")
      .insert({
        tenant_id: data.tenant_id,
        full_name: data.full_name,
        phone: data.phone,
        email: data.email || null,
        city: data.city ?? null,
        treatment_slug: data.treatment_slug ?? null,
        doctor_slug: data.doctor_slug ?? null,
        preferred_at: data.preferred_at ?? null,
        message: data.message ?? null,
        source: data.source ?? "website",
        utm: data.utm ?? {},
        status: "new",
      })
      .select("id")
      .single();
    if (error) throw new Error("Could not submit request");
    return { id: row.id };
  });


// =====================================================================
// ADMIN CRUD (auth-gated)
// =====================================================================

const uuidInput = z.object({ id: z.string().uuid() });
const tenantInput = z.object({ tenant_id: z.string().uuid() });

async function assertCms(context: { supabase: SupabaseAuthCtx["supabase"]; userId: string }, tenantId: string) {
  const { data } = await context.supabase.rpc("can_manage_cms", {
    _user_id: context.userId,
    _tenant_id: tenantId,
  });
  if (!data) throw new Error("Not authorized to manage CMS for this tenant");
}
type SupabaseAuthCtx = { supabase: ReturnType<typeof publicClient>; userId: string };

// -- Sites
export const adminGetSite = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => tenantInput.parse(d))
  .handler(async ({ context, data }) => {
    const { data: row } = await context.supabase.from("cms_sites").select("*").eq("tenant_id", data.tenant_id).maybeSingle();
    return row;
  });

export const adminUpsertSite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        tenant_id: z.string().uuid(),
        patch: z.record(z.string(), z.unknown()),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertCms(context, data.tenant_id);
    const payload = { tenant_id: data.tenant_id, ...data.patch };
    const { data: row, error } = await context.supabase
      .from("cms_sites")
      .upsert(payload, { onConflict: "tenant_id" })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

// -- Generic list/upsert/delete factory for the tenant-scoped entity tables
type EntityTable =
  | "cms_pages"
  | "cms_blog_posts"
  | "cms_blog_authors"
  | "cms_blog_categories"
  | "cms_blog_tags"
  | "cms_doctors"
  | "cms_treatments"
  | "cms_franchise_offers"
  | "cms_academy_courses"
  | "cms_products"
  | "cms_media_assets"
  | "cms_navigation_menus"
  | "cms_redirects"
  | "cms_appointment_requests";

export const adminList = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        table: z.string(),
        tenant_id: z.string().uuid(),
        limit: z.number().int().max(500).default(200),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = context.supabase as any;
    const { data: rows, error } = await sb
      .from(data.table)
      .select("*")
      .eq("tenant_id", data.tenant_id)
      .order("updated_at", { ascending: false })
      .limit(data.limit);
    if (error) throw new Error(error.message);
    return (rows ?? []) as unknown as Json[];
  });

export const adminUpsert = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        table: z.string(),
        tenant_id: z.string().uuid(),
        row: z.record(z.string(), z.unknown()),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertCms(context, data.tenant_id);
    const payload: Record<string, unknown> = { ...data.row, tenant_id: data.tenant_id };
    if (payload.status === "published" && !payload.published_at) {
      payload.published_at = new Date().toISOString();
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = context.supabase as any;
    const { data: row, error } = await sb.from(data.table).upsert(payload).select().single();
    if (error) throw new Error(error.message);
    return row as unknown as Json;
  });

export const adminDelete = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        table: z.string(),
        tenant_id: z.string().uuid(),
        id: z.string().uuid(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertCms(context, data.tenant_id);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = context.supabase as any;
    const { error } = await sb
      .from(data.table)
      .delete()
      .eq("id", data.id)
      .eq("tenant_id", data.tenant_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminPublish = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        table: z.string(),
        tenant_id: z.string().uuid(),
        id: z.string().uuid(),
        status: z.enum(["draft", "scheduled", "published", "archived"]),
        publish_at: z.string().datetime().optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertCms(context, data.tenant_id);
    const patch: Record<string, unknown> = { status: data.status };
    if (data.status === "published") patch.published_at = new Date().toISOString();
    if (data.status === "scheduled" && data.publish_at) patch.publish_at = data.publish_at;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = context.supabase as any;
    const { data: row, error } = await sb
      .from(data.table)
      .update(patch)
      .eq("id", data.id)
      .eq("tenant_id", data.tenant_id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row as unknown as Json;
  });

// -- Block type registry (read-only from client)
export const listBlockTypes = createServerFn({ method: "GET" }).handler(async () => {
  const sb = publicClient();
  const { data } = await sb.from("cms_block_types").select("*").eq("is_active", true).order("sort_order");
  return data ?? [];
});

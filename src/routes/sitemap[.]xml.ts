import { createFileRoute } from "@tanstack/react-router";
import { listSitemapEntries } from "@/lib/api/cms.functions";

const BASE = "https://trycare360.lovable.app";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const e = await listSitemapEntries();
        const staticEntries = [
          "/", "/treatments", "/doctors", "/products",
          "/franchise", "/academy", "/blog", "/about", "/contact", "/book",
        ];
        const urls: { loc: string; lastmod?: string }[] = staticEntries.map((p) => ({ loc: `${BASE}${p}` }));
        for (const p of e.pages) urls.push({ loc: `${BASE}${p.path}`, lastmod: p.updated_at ?? undefined });
        for (const p of e.posts) urls.push({ loc: `${BASE}/blog/${p.slug}`, lastmod: p.updated_at ?? undefined });
        for (const d of e.doctors) urls.push({ loc: `${BASE}/doctors/${d.slug}`, lastmod: d.updated_at ?? undefined });
        for (const t of e.treatments) urls.push({ loc: `${BASE}/treatments/${t.slug}`, lastmod: t.updated_at ?? undefined });
        for (const c of e.courses) urls.push({ loc: `${BASE}/academy`, lastmod: c.updated_at ?? undefined });
        for (const p of e.products) urls.push({ loc: `${BASE}/products/${p.slug}`, lastmod: p.updated_at ?? undefined });

        const xml =
          `<?xml version="1.0" encoding="UTF-8"?>\n` +
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
          urls
            .map(
              (u) =>
                `  <url><loc>${u.loc}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ""}</url>`,
            )
            .join("\n") +
          `\n</urlset>\n`;

        return new Response(xml, {
          headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" },
        });
      },
    },
  },
});

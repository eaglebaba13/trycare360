import { createFileRoute } from "@tanstack/react-router";
import { listPublishedPosts } from "@/lib/api/cms.functions";

const BASE = "https://trycare360.lovable.app";

export const Route = createFileRoute("/rss.xml")({
  server: {
    handlers: {
      GET: async () => {
        const posts = await listPublishedPosts({ data: { limit: 50 } });
        const items = posts
          .map(
            (p) => `
    <item>
      <title><![CDATA[${p.title}]]></title>
      <link>${BASE}/blog/${p.slug}</link>
      <guid isPermaLink="true">${BASE}/blog/${p.slug}</guid>
      ${p.published_at ? `<pubDate>${new Date(p.published_at).toUTCString()}</pubDate>` : ""}
      ${p.excerpt ? `<description><![CDATA[${p.excerpt}]]></description>` : ""}
    </item>`,
          )
          .join("");
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>TryCare360 Blog</title>
    <link>${BASE}/blog</link>
    <description>Insights on hair, skin, nail and nutrition from TryCare360 experts.</description>
    <language>en</language>${items}
  </channel>
</rss>`;
        return new Response(xml, {
          headers: { "Content-Type": "application/rss+xml", "Cache-Control": "public, max-age=3600" },
        });
      },
    },
  },
});

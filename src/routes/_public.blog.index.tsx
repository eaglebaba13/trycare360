import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { listPublishedPosts } from "@/lib/api/cms.functions";

export const Route = createFileRoute("/_public/blog/")({
  component: BlogIndex,
  head: () => ({
    meta: [
      { title: "Blog — TryCare360" },
      { name: "description", content: "Expert-written articles on hair, skin, nail and nutrition — from the TryCare360 clinical team." },
      { property: "og:title", content: "Blog — TryCare360" },
      { property: "og:description", content: "Expert articles on hair, skin, nail and nutrition." },
    ],
    links: [{ rel: "canonical", href: "https://trycare360.lovable.app/blog" }],
  }),
});

function BlogIndex() {
  const fn = useServerFn(listPublishedPosts);
  const { data: rows = [] } = useQuery({ queryKey: ["pub-posts-all"], queryFn: () => fn({ data: { limit: 50 } }) });

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 lg:px-6">
      <div className="mb-10">
        <div className="text-xs font-semibold uppercase tracking-wider text-primary">Insights</div>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight md:text-5xl">Care journal</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">Guides, myth-busters and clinical explainers from our doctors.</p>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {rows.map((p) => (
          <Link key={p.slug} to="/blog/$slug" params={{ slug: p.slug }} className="group">
            <Card className="overflow-hidden h-full">
              {p.cover_url ? (
                <img src={p.cover_url} alt={p.title} className="aspect-[16/9] w-full object-cover" loading="lazy" />
              ) : (
                <div className="aspect-[16/9] w-full bg-gradient-to-br from-primary/10 to-accent/10" />
              )}
              <div className="p-5">
                <div className="font-semibold group-hover:text-primary">{p.title}</div>
                {p.excerpt && <div className="mt-2 line-clamp-3 text-sm text-muted-foreground">{p.excerpt}</div>}
                <div className="mt-3 text-xs text-muted-foreground">
                  {p.published_at ? new Date(p.published_at).toLocaleDateString() : ""}
                  {p.reading_minutes ? ` · ${p.reading_minutes} min read` : ""}
                </div>
              </div>
            </Card>
          </Link>
        ))}
        {rows.length === 0 && (
          <div className="col-span-full rounded-xl border border-dashed p-16 text-center text-sm text-muted-foreground">
            No articles published yet.
          </div>
        )}
      </div>
    </div>
  );
}

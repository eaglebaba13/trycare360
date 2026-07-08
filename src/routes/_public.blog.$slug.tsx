import { createFileRoute, notFound } from "@tanstack/react-router";
import { BlockRenderer, type CmsBlock } from "@/lib/cms/blocks";
import { getPost } from "@/lib/api/cms.functions";

export const Route = createFileRoute("/_public/blog/$slug")({
  loader: async ({ params }) => {
    const p = await getPost({ data: { slug: params.slug } });
    if (!p) throw notFound();
    return p;
  },
  component: PostDetail,
  head: ({ loaderData, params }) => {
    const p = loaderData;
    const url = `https://trycare360.lovable.app/blog/${params.slug}`;
    return {
      meta: [
        { title: `${p?.title ?? "Article"} — TryCare360` },
        { name: "description", content: p?.excerpt ?? "" },
        { property: "og:title", content: p?.title ?? "" },
        { property: "og:description", content: p?.excerpt ?? "" },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        ...(p?.cover_url ? [{ property: "og:image" as const, content: p.cover_url as string }] : []),
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: p
        ? [
            {
              type: "application/ld+json",
              children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "Article",
                headline: p.title,
                description: p.excerpt,
                image: p.cover_url,
                datePublished: p.published_at,
                author: p.author ? { "@type": "Person", name: p.author.name } : undefined,
              }),
            },
          ]
        : [],
    };
  },
});

function PostDetail() {
  const p = Route.useLoaderData();
  const blocks = Array.isArray(p.body_blocks) ? (p.body_blocks as unknown as CmsBlock[]) : [];
  return (
    <article>
      <header className="mx-auto max-w-3xl px-4 pt-16 pb-8 lg:px-6">
        {p.category && <div className="text-xs font-semibold uppercase tracking-wider text-primary">{p.category.name}</div>}
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight md:text-5xl">{p.title}</h1>
        {p.excerpt && <p className="mt-4 text-lg text-muted-foreground">{p.excerpt}</p>}
        <div className="mt-6 flex items-center gap-3 text-sm text-muted-foreground">
          {p.author?.avatar_url && <img src={p.author.avatar_url} alt={p.author.name} className="h-9 w-9 rounded-full object-cover" />}
          {p.author && <span className="font-medium text-foreground">{p.author.name}</span>}
          {p.published_at && <span>· {new Date(p.published_at).toLocaleDateString()}</span>}
          {p.reading_minutes && <span>· {p.reading_minutes} min read</span>}
        </div>
      </header>
      {p.cover_url && (
        <div className="mx-auto max-w-4xl px-4 lg:px-6">
          <img src={p.cover_url} alt={p.title} className="aspect-[16/9] w-full rounded-2xl object-cover shadow-elev-1" />
        </div>
      )}
      {blocks.length > 0 ? (
        <BlockRenderer blocks={blocks} />
      ) : p.body_text ? (
        <div className="mx-auto max-w-3xl whitespace-pre-line px-4 py-10 text-foreground lg:px-6">{p.body_text}</div>
      ) : null}
    </article>
  );
}

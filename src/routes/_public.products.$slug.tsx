import { createFileRoute, notFound } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getProduct } from "@/lib/api/cms.functions";
import { BlockRenderer, type CmsBlock } from "@/lib/cms/blocks";

export const Route = createFileRoute("/_public/products/$slug")({
  loader: async ({ params }) => {
    const p = await getProduct({ data: { slug: params.slug } });
    if (!p) throw notFound();
    return p;
  },
  component: ProductDetail,
  head: ({ loaderData, params }) => {
    const p = loaderData;
    const url = `https://trycare360.lovable.app/products/${params.slug}`;
    return {
      meta: [
        { title: `${p?.name ?? "Product"} — TryCare360` },
        { name: "description", content: p?.short_description ?? "" },
        { property: "og:title", content: p?.name ?? "" },
        { property: "og:description", content: p?.short_description ?? "" },
        { property: "og:type", content: "product" },
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
                "@type": "Product",
                name: p.name,
                brand: p.brand,
                image: p.cover_url,
                description: p.short_description,
                offers: p.price != null ? { "@type": "Offer", price: p.price, priceCurrency: p.currency ?? "INR" } : undefined,
              }),
            },
          ]
        : [],
    };
  },
});

function ProductDetail() {
  const p = Route.useLoaderData();
  const blocks = Array.isArray(p.description_blocks) ? (p.description_blocks as unknown as CmsBlock[]) : [];
  return (
    <article>
      <header className="border-b">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-2 md:items-start lg:px-6">
          {p.cover_url ? (
            <img src={p.cover_url} alt={p.name} className="aspect-square w-full rounded-2xl object-cover shadow-elev-1" />
          ) : (
            <div className="aspect-square w-full rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10" />
          )}
          <div>
            {p.brand && <div className="text-xs uppercase tracking-wider text-muted-foreground">{p.brand}</div>}
            <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight md:text-5xl">{p.name}</h1>
            {p.short_description && <p className="mt-4 text-muted-foreground">{p.short_description}</p>}
            {p.price != null && (
              <div className="mt-6 flex items-baseline gap-3">
                <span className="font-display text-3xl font-semibold text-primary">{p.currency ?? "INR"} {p.price}</span>
                {p.compare_at_price != null && (
                  <span className="text-muted-foreground line-through">{p.currency ?? "INR"} {p.compare_at_price}</span>
                )}
              </div>
            )}
            <div className="mt-8">
              <Button size="lg" asChild>
                <a href={p.cta_url ?? "/contact"}>Buy now</a>
              </Button>
            </div>
            {Array.isArray(p.benefits) && p.benefits.length > 0 && (
              <div className="mt-8 space-y-2">
                <div className="text-sm font-semibold">Key benefits</div>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {(p.benefits as { text?: string }[]).map((b, i) => (
                    <li key={i}>• {b.text}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </header>
      {blocks.length > 0 && <BlockRenderer blocks={blocks} />}
      {p.usage && (
        <section className="mx-auto max-w-3xl px-4 py-10 lg:px-6">
          <h2 className="mb-3 font-display text-xl font-semibold">How to use</h2>
          <div className="whitespace-pre-line text-muted-foreground">{p.usage}</div>
        </section>
      )}
    </article>
  );
}

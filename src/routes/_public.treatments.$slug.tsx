import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BlockRenderer, type CmsBlock } from "@/lib/cms/blocks";
import { getTreatment } from "@/lib/api/cms.functions";

export const Route = createFileRoute("/_public/treatments/$slug")({
  loader: async ({ params }) => {
    const t = await getTreatment({ data: { slug: params.slug } });
    if (!t) throw notFound();
    return t;
  },
  component: TreatmentDetail,
  head: ({ loaderData, params }) => {
    const t = loaderData;
    const url = `https://trycare360.lovable.app/treatments/${params.slug}`;
    return {
      meta: [
        { title: `${t?.name ?? "Treatment"} — TryCare360` },
        { name: "description", content: t?.summary ?? "Doctor-led treatment at TryCare360." },
        { property: "og:title", content: `${t?.name ?? "Treatment"} — TryCare360` },
        { property: "og:description", content: t?.summary ?? "" },
        { property: "og:type", content: "product" },
        { property: "og:url", content: url },
        ...(t?.cover_url ? [{ property: "og:image" as const, content: t.cover_url as string }] : []),
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: t
        ? [
            {
              type: "application/ld+json",
              children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "MedicalProcedure",
                name: t.name,
                description: t.summary,
                image: t.cover_url,
              }),
            },
          ]
        : [],
    };
  },
});

function TreatmentDetail() {
  const t = Route.useLoaderData();
  const blocks = Array.isArray(t.description_blocks) ? (t.description_blocks as unknown as CmsBlock[]) : [];

  return (
    <article>
      {/* Header */}
      <header className="border-b bg-gradient-to-b from-muted/30 to-background">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-2 md:items-center lg:px-6">
          <div>
            {t.category && <div className="text-xs font-semibold uppercase tracking-wider text-primary">{t.category}</div>}
            <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight md:text-5xl">{t.name}</h1>
            {t.summary && <p className="mt-4 max-w-xl text-muted-foreground">{t.summary}</p>}
            <div className="mt-6 flex flex-wrap items-center gap-4 text-sm">
              {t.price_from != null && (
                <div className="rounded-full border bg-card px-3 py-1">
                  From <span className="font-semibold text-foreground">{t.price_currency ?? "INR"} {t.price_from}</span>
                </div>
              )}
              {t.duration_minutes != null && (
                <div className="rounded-full border bg-card px-3 py-1">{t.duration_minutes} min session</div>
              )}
            </div>
            <div className="mt-8 flex gap-3">
              <Link to="/book" search={{ treatment: t.slug }}>
                <Button size="lg">Book this treatment</Button>
              </Link>
              <Link to="/contact">
                <Button size="lg" variant="outline">Ask a question</Button>
              </Link>
            </div>
          </div>
          {t.cover_url && (
            <img src={t.cover_url} alt={t.name} className="aspect-[4/3] w-full rounded-2xl object-cover shadow-elev-2" />
          )}
        </div>
      </header>

      {/* Blocks */}
      {blocks.length > 0 && <BlockRenderer blocks={blocks} />}

      {/* Benefits */}
      {Array.isArray(t.benefits) && t.benefits.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-16 lg:px-6">
          <h2 className="mb-8 font-display text-2xl font-semibold tracking-tight">Benefits</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {(t.benefits as { title?: string; description?: string }[]).map((b, i) => (
              <Card key={i} className="p-5">
                <div className="font-semibold">{b.title}</div>
                {b.description && <div className="mt-1 text-sm text-muted-foreground">{b.description}</div>}
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Doctors */}
      {Array.isArray(t.doctors) && t.doctors.length > 0 && (
        <section className="border-t bg-muted/20">
          <div className="mx-auto max-w-6xl px-4 py-16 lg:px-6">
            <h2 className="mb-8 font-display text-2xl font-semibold tracking-tight">Doctors offering this treatment</h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {(t.doctors as { slug: string; name: string; title?: string; photo_url?: string }[]).map((d) => (
                <Link key={d.slug} to="/doctors/$slug" params={{ slug: d.slug }} className="group">
                  <Card className="overflow-hidden">
                    {d.photo_url && <img src={d.photo_url} alt={d.name} className="aspect-square w-full object-cover" />}
                    <div className="p-4">
                      <div className="font-semibold group-hover:text-primary">{d.name}</div>
                      {d.title && <div className="text-xs text-muted-foreground">{d.title}</div>}
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </article>
  );
}

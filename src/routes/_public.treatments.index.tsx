import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { listTreatments } from "@/lib/api/cms.functions";

export const Route = createFileRoute("/_public/treatments/")({
  component: TreatmentsIndex,
  head: () => ({
    meta: [
      { title: "Treatments — TryCare360" },
      { name: "description", content: "Doctor-led treatments for hair, skin, nail and nutrition. Science-backed protocols, personalised for you." },
      { property: "og:title", content: "Treatments — TryCare360" },
      { property: "og:description", content: "Doctor-led treatments for hair, skin, nail and nutrition." },
    ],
    links: [{ rel: "canonical", href: "https://trycare360.lovable.app/treatments" }],
  }),
});

function TreatmentsIndex() {
  const fn = useServerFn(listTreatments);
  const { data: rows = [] } = useQuery({ queryKey: ["pub-treatments-all"], queryFn: () => fn() });

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 lg:px-6">
      <div className="mb-10">
        <div className="text-xs font-semibold uppercase tracking-wider text-primary">Care catalogue</div>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight md:text-5xl">Treatments</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Every treatment is doctor-led, safety-first and tailored to your unique goals.
        </p>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((t) => (
          <Link key={t.slug} to="/treatments/$slug" params={{ slug: t.slug }} className="group">
            <Card className="overflow-hidden h-full transition-shadow hover:shadow-elev-2">
              {t.cover_url ? (
                <img src={t.cover_url} alt={t.name} className="aspect-[4/3] w-full object-cover" loading="lazy" />
              ) : (
                <div className="aspect-[4/3] w-full bg-gradient-to-br from-primary/10 to-accent/10" />
              )}
              <div className="p-5">
                {t.category && <div className="text-xs uppercase tracking-wider text-muted-foreground">{t.category}</div>}
                <div className="mt-1 font-semibold group-hover:text-primary">{t.name}</div>
                {t.summary && <div className="mt-1 line-clamp-2 text-sm text-muted-foreground">{t.summary}</div>}
                {t.price_from != null && (
                  <div className="mt-3 text-sm font-medium text-primary">
                    From {t.price_currency ?? "INR"} {t.price_from}
                  </div>
                )}
              </div>
            </Card>
          </Link>
        ))}
        {rows.length === 0 && (
          <div className="col-span-full rounded-xl border border-dashed p-16 text-center text-sm text-muted-foreground">
            No treatments published yet. Admins can add treatments from the CMS.
          </div>
        )}
      </div>
    </div>
  );
}

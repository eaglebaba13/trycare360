import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { listFranchise } from "@/lib/api/cms.functions";

export const Route = createFileRoute("/_public/franchise")({
  component: FranchisePage,
  head: () => ({
    meta: [
      { title: "Franchise with TryCare360" },
      { name: "description", content: "Join a proven healthcare network. Explore our franchise offers, investment tiers and support model." },
      { property: "og:title", content: "Franchise with TryCare360" },
      { property: "og:description", content: "Join a proven healthcare network. Explore franchise opportunities." },
    ],
    links: [{ rel: "canonical", href: "https://trycare360.lovable.app/franchise" }],
  }),
});

function FranchisePage() {
  const fn = useServerFn(listFranchise);
  const { data: rows = [] } = useQuery({ queryKey: ["pub-franchise"], queryFn: () => fn() });
  return (
    <div>
      <section className="border-b bg-gradient-to-b from-muted/30 to-background">
        <div className="mx-auto max-w-4xl px-4 py-20 text-center lg:px-6">
          <div className="text-xs font-semibold uppercase tracking-wider text-primary">Partner with us</div>
          <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight md:text-5xl">Franchise opportunities</h1>
          <p className="mt-4 text-muted-foreground">
            Own a TryCare360 clinic in your city. Proven playbook, clinical expertise, and end-to-end support.
          </p>
          <Button size="lg" className="mt-8" asChild>
            <a href="/contact?topic=franchise">Talk to our franchise team</a>
          </Button>
        </div>
      </section>
      <div className="mx-auto max-w-6xl px-4 py-16 lg:px-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {rows.map((f) => (
            <Card key={f.slug} className="p-6 h-full">
              {f.tier && <div className="text-xs font-semibold uppercase tracking-wider text-primary">{f.tier}</div>}
              <h3 className="mt-2 font-display text-xl font-semibold">{f.title}</h3>
              {f.summary && <p className="mt-2 text-sm text-muted-foreground">{f.summary}</p>}
              <div className="mt-4 space-y-1 text-sm">
                {f.investment_min != null && (
                  <div>
                    <span className="text-muted-foreground">Investment:</span>{" "}
                    <span className="font-medium">
                      {f.currency ?? "INR"} {f.investment_min}
                      {f.investment_max != null ? ` – ${f.investment_max}` : "+"}
                    </span>
                  </div>
                )}
                {f.area_sqft_min != null && (
                  <div>
                    <span className="text-muted-foreground">Area:</span>{" "}
                    <span className="font-medium">{f.area_sqft_min}{f.area_sqft_max ? `–${f.area_sqft_max}` : "+"} sqft</span>
                  </div>
                )}
              </div>
              {f.brochure_url && (
                <Button variant="outline" size="sm" className="mt-5" asChild>
                  <a href={f.brochure_url} target="_blank" rel="noreferrer">Download brochure</a>
                </Button>
              )}
            </Card>
          ))}
          {rows.length === 0 && (
            <div className="col-span-full rounded-xl border border-dashed p-16 text-center text-sm text-muted-foreground">
              Franchise tiers coming soon.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

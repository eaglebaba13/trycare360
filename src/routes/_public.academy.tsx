import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { listCourses } from "@/lib/api/cms.functions";

export const Route = createFileRoute("/_public/academy")({
  component: AcademyPage,
  head: () => ({
    meta: [
      { title: "Academy — TryCare360" },
      { name: "description", content: "Certification programs and clinical training from TryCare360 Academy." },
      { property: "og:title", content: "Academy — TryCare360" },
      { property: "og:description", content: "Certification programs and clinical training." },
    ],
    links: [{ rel: "canonical", href: "https://trycare360.lovable.app/academy" }],
  }),
});

function AcademyPage() {
  const fn = useServerFn(listCourses);
  const { data: rows = [] } = useQuery({ queryKey: ["pub-courses"], queryFn: () => fn() });
  return (
    <div>
      <section className="border-b bg-gradient-to-b from-muted/30 to-background">
        <div className="mx-auto max-w-4xl px-4 py-20 text-center lg:px-6">
          <div className="text-xs font-semibold uppercase tracking-wider text-primary">Learn from the best</div>
          <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight md:text-5xl">TryCare360 Academy</h1>
          <p className="mt-4 text-muted-foreground">
            Industry-leading certifications in trichology, aesthetics and nutrition — taught by practicing experts.
          </p>
        </div>
      </section>
      <div className="mx-auto max-w-6xl px-4 py-16 lg:px-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {rows.map((c) => (
            <Card key={c.slug} className="overflow-hidden">
              {c.cover_url && <img src={c.cover_url} alt={c.title} className="aspect-[16/9] w-full object-cover" />}
              <div className="p-6">
                <div className="flex flex-wrap gap-2 text-xs">
                  {c.level && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">{c.level}</span>}
                  {c.duration && <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">{c.duration}</span>}
                </div>
                <h3 className="mt-3 font-display text-xl font-semibold">{c.title}</h3>
                {c.subtitle && <div className="text-sm text-muted-foreground">{c.subtitle}</div>}
                {c.summary && <p className="mt-2 text-sm text-muted-foreground">{c.summary}</p>}
                <div className="mt-4 flex items-center justify-between">
                  {c.price != null && <div className="font-semibold text-primary">{c.currency ?? "INR"} {c.price}</div>}
                  {c.brochure_url && (
                    <Button size="sm" variant="outline" asChild>
                      <a href={c.brochure_url} target="_blank" rel="noreferrer">Brochure</a>
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
          {rows.length === 0 && (
            <div className="col-span-full rounded-xl border border-dashed p-16 text-center text-sm text-muted-foreground">
              Courses coming soon.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

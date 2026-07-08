import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { listDoctors } from "@/lib/api/cms.functions";

export const Route = createFileRoute("/_public/doctors/")({
  component: DoctorsIndex,
  head: () => ({
    meta: [
      { title: "Our Doctors — TryCare360" },
      { name: "description", content: "Meet the certified specialists leading personalised care at TryCare360." },
      { property: "og:title", content: "Our Doctors — TryCare360" },
      { property: "og:description", content: "Meet the certified specialists leading personalised care at TryCare360." },
    ],
    links: [{ rel: "canonical", href: "https://trycare360.lovable.app/doctors" }],
  }),
});

function DoctorsIndex() {
  const fn = useServerFn(listDoctors);
  const { data: rows = [] } = useQuery({ queryKey: ["pub-doctors-all"], queryFn: () => fn() });

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 lg:px-6">
      <div className="mb-10">
        <div className="text-xs font-semibold uppercase tracking-wider text-primary">Our specialists</div>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight md:text-5xl">Meet our doctors</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Board-certified specialists across trichology, dermatology and clinical nutrition.
        </p>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {rows.map((d) => (
          <Link key={d.slug} to="/doctors/$slug" params={{ slug: d.slug }} className="group">
            <Card className="overflow-hidden h-full">
              {d.photo_url ? (
                <img src={d.photo_url} alt={d.name} className="aspect-square w-full object-cover" loading="lazy" />
              ) : (
                <div className="aspect-square w-full bg-gradient-to-br from-primary/10 to-accent/10" />
              )}
              <div className="p-4">
                <div className="font-semibold group-hover:text-primary">{d.name}</div>
                {d.title && <div className="text-xs text-muted-foreground">{d.title}</div>}
                {Array.isArray(d.specialties) && d.specialties.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {d.specialties.slice(0, 3).map((s: string) => (
                      <span key={s} className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">{s}</span>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </Link>
        ))}
        {rows.length === 0 && (
          <div className="col-span-full rounded-xl border border-dashed p-16 text-center text-sm text-muted-foreground">
            No doctors published yet.
          </div>
        )}
      </div>
    </div>
  );
}

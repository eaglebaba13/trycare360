import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { GraduationCap, Award, Languages } from "lucide-react";
import { getDoctor } from "@/lib/api/cms.functions";

export const Route = createFileRoute("/_public/doctors/$slug")({
  loader: async ({ params }) => {
    const d = await getDoctor({ data: { slug: params.slug } });
    if (!d) throw notFound();
    return d;
  },
  component: DoctorDetail,
  head: ({ loaderData, params }) => {
    const d = loaderData;
    const url = `https://trycare360.lovable.app/doctors/${params.slug}`;
    return {
      meta: [
        { title: `${d?.name ?? "Doctor"} — TryCare360` },
        { name: "description", content: d?.bio?.slice(0, 160) ?? `${d?.name ?? ""} at TryCare360.` },
        { property: "og:title", content: `${d?.name ?? "Doctor"} — TryCare360` },
        { property: "og:description", content: d?.bio?.slice(0, 160) ?? "" },
        { property: "og:type", content: "profile" },
        { property: "og:url", content: url },
        ...(d?.photo_url ? [{ property: "og:image" as const, content: d.photo_url as string }] : []),
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: d
        ? [
            {
              type: "application/ld+json",
              children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "Physician",
                name: d.name,
                image: d.photo_url,
                jobTitle: d.title,
                medicalSpecialty: d.specialties,
              }),
            },
          ]
        : [],
    };
  },
});

function DoctorDetail() {
  const d = Route.useLoaderData();
  return (
    <article>
      <header className="border-b bg-gradient-to-b from-muted/30 to-background">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-[280px_1fr] md:items-start lg:px-6">
          {d.photo_url ? (
            <img src={d.photo_url} alt={d.name} className="aspect-square w-full max-w-[280px] rounded-2xl object-cover shadow-elev-2" />
          ) : (
            <div className="aspect-square w-full max-w-[280px] rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10" />
          )}
          <div>
            <h1 className="font-display text-4xl font-semibold tracking-tight md:text-5xl">{d.name}</h1>
            {d.title && <div className="mt-2 text-lg text-muted-foreground">{d.title}</div>}
            <div className="mt-4 flex flex-wrap gap-2">
              {Array.isArray(d.specialties) &&
                d.specialties.map((s: string) => (
                  <span key={s} className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">{s}</span>
                ))}
            </div>
            <div className="mt-6 flex flex-wrap gap-6 text-sm text-muted-foreground">
              {d.years_experience != null && (
                <div className="flex items-center gap-2"><Award className="h-4 w-4 text-primary" /> {d.years_experience}+ years experience</div>
              )}
              {Array.isArray(d.credentials) && d.credentials.length > 0 && (
                <div className="flex items-center gap-2"><GraduationCap className="h-4 w-4 text-primary" /> {d.credentials.join(", ")}</div>
              )}
              {Array.isArray(d.languages) && d.languages.length > 0 && (
                <div className="flex items-center gap-2"><Languages className="h-4 w-4 text-primary" /> {d.languages.join(", ")}</div>
              )}
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/book" search={{ doctor: d.slug }}>
                <Button size="lg">Book with {d.name.split(" ")[0]}</Button>
              </Link>
              <Link to="/contact"><Button size="lg" variant="outline">Contact</Button></Link>
            </div>
          </div>
        </div>
      </header>

      {d.bio && (
        <section className="mx-auto max-w-3xl px-4 py-16 lg:px-6">
          <h2 className="mb-6 font-display text-2xl font-semibold tracking-tight">About</h2>
          <div className="whitespace-pre-line text-muted-foreground">{d.bio}</div>
        </section>
      )}

      {Array.isArray(d.clinics) && d.clinics.length > 0 && (
        <section className="border-t bg-muted/20">
          <div className="mx-auto max-w-6xl px-4 py-16 lg:px-6">
            <h2 className="mb-8 font-display text-2xl font-semibold tracking-tight">Consulting at</h2>
            <div className="grid gap-4 md:grid-cols-3">
              {(d.clinics as { name?: string; address?: string; phone?: string }[]).map((c, i) => (
                <Card key={i} className="p-5">
                  <div className="font-semibold">{c.name}</div>
                  {c.address && <div className="mt-1 text-sm text-muted-foreground">{c.address}</div>}
                  {c.phone && <div className="mt-2 text-sm text-primary">{c.phone}</div>}
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}
    </article>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, Sparkles, ShieldCheck, HeartPulse, Users, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { listTreatments, listDoctors, listPublishedPosts } from "@/lib/api/cms.functions";

export const Route = createFileRoute("/_public/")({
  component: HomePage,
  head: () => ({
    meta: [
      { title: "TryCare360 — Integrated Healthcare, Hair, Skin, Nail & Nutrition" },
      { name: "description", content: "Expert doctors, science-backed treatments and personalised care for hair, skin, nail and nutrition — all under one trusted network." },
      { property: "og:title", content: "TryCare360 — Integrated Healthcare Network" },
      { property: "og:description", content: "Expert doctors, science-backed treatments and personalised care under one trusted network." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://trycare360.lovable.app/" },
    ],
    links: [{ rel: "canonical", href: "https://trycare360.lovable.app/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "MedicalBusiness",
          name: "TryCare360",
          url: "https://trycare360.lovable.app",
          medicalSpecialty: ["Dermatology", "Trichology", "Nutrition"],
        }),
      },
    ],
  }),
});

function HomePage() {
  const listT = useServerFn(listTreatments);
  const listD = useServerFn(listDoctors);
  const listP = useServerFn(listPublishedPosts);
  const { data: treatments = [] } = useQuery({ queryKey: ["pub-treatments"], queryFn: () => listT() });
  const { data: doctors = [] } = useQuery({ queryKey: ["pub-doctors"], queryFn: () => listD() });
  const { data: posts = [] } = useQuery({ queryKey: ["pub-posts"], queryFn: () => listP({ data: { limit: 3 } }) });

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b bg-gradient-to-b from-background via-background to-muted/20">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 py-20 md:grid-cols-2 md:items-center lg:px-6 lg:py-28">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border bg-card/60 px-3 py-1 text-xs font-medium text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-[color:var(--gold)]" /> Trusted by 100,000+ patients
            </div>
            <h1 className="font-display text-4xl font-semibold tracking-tight md:text-5xl lg:text-6xl">
              Personalised care for <span className="text-primary">hair, skin, nail</span> &amp; nutrition
            </h1>
            <p className="mt-5 max-w-xl text-base text-muted-foreground md:text-lg">
              Expert doctors, evidence-based treatments and a 360° care journey — from AI-powered assessment to at-home follow-up.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/book">
                <Button size="lg" className="gap-2">
                  Book a consultation <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/treatments">
                <Button size="lg" variant="outline">Explore treatments</Button>
              </Link>
            </div>
            <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-primary" /> Doctor-led care</div>
              <div className="flex items-center gap-1.5"><HeartPulse className="h-4 w-4 text-primary" /> Science-backed protocols</div>
              <div className="flex items-center gap-1.5"><Users className="h-4 w-4 text-primary" /> 50+ clinics across India</div>
            </div>
          </div>
          <div className="relative">
            <div className="absolute -inset-6 rounded-3xl bg-gradient-to-br from-primary/10 via-accent/10 to-transparent blur-2xl" />
            <div className="relative grid grid-cols-2 gap-4">
              <StatTile value="100k+" label="Patients cared for" />
              <StatTile value="200+" label="Expert doctors" />
              <StatTile value="50+" label="Clinics" />
              <StatTile value="4.8★" label="Google rating" />
            </div>
          </div>
        </div>
      </section>

      {/* Featured treatments */}
      <section className="mx-auto max-w-6xl px-4 py-16 lg:px-6">
        <SectionHead
          eyebrow="Treatments"
          title="Care for every concern"
          subtitle="From hair regrowth to advanced skin therapy — safe, effective and doctor-supervised."
          cta={{ label: "See all treatments", to: "/treatments" }}
        />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {treatments.slice(0, 6).map((t) => (
            <Link key={t.slug} to="/treatments/$slug" params={{ slug: t.slug }} className="group">
              <Card className="overflow-hidden transition-shadow hover:shadow-elev-2">
                {t.cover_url ? (
                  <img src={t.cover_url} alt={t.name} className="aspect-[4/3] w-full object-cover" loading="lazy" />
                ) : (
                  <div className="aspect-[4/3] w-full bg-gradient-to-br from-primary/10 to-accent/10" />
                )}
                <div className="p-5">
                  {t.category && <div className="text-xs uppercase tracking-wider text-muted-foreground">{t.category}</div>}
                  <div className="mt-1 font-semibold group-hover:text-primary">{t.name}</div>
                  {t.summary && <div className="mt-1 line-clamp-2 text-sm text-muted-foreground">{t.summary}</div>}
                </div>
              </Card>
            </Link>
          ))}
          {treatments.length === 0 && <EmptyState label="Treatments will appear here once published from the CMS." />}
        </div>
      </section>

      {/* Doctors */}
      <section className="border-y bg-muted/20">
        <div className="mx-auto max-w-6xl px-4 py-16 lg:px-6">
          <SectionHead
            eyebrow="Doctors"
            title="Meet the specialists behind your care"
            cta={{ label: "See all doctors", to: "/doctors" }}
          />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {doctors.slice(0, 4).map((d) => (
              <Link key={d.slug} to="/doctors/$slug" params={{ slug: d.slug }} className="group">
                <Card className="overflow-hidden transition-shadow hover:shadow-elev-2">
                  {d.photo_url ? (
                    <img src={d.photo_url} alt={d.name} className="aspect-square w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="aspect-square w-full bg-gradient-to-br from-primary/10 to-accent/10" />
                  )}
                  <div className="p-4">
                    <div className="font-semibold group-hover:text-primary">{d.name}</div>
                    {d.title && <div className="text-xs text-muted-foreground">{d.title}</div>}
                    {d.years_experience != null && (
                      <div className="mt-2 text-xs text-muted-foreground">{d.years_experience}+ years experience</div>
                    )}
                  </div>
                </Card>
              </Link>
            ))}
            {doctors.length === 0 && <EmptyState label="Doctor profiles will appear here once published from the CMS." />}
          </div>
        </div>
      </section>

      {/* Blog */}
      <section className="mx-auto max-w-6xl px-4 py-16 lg:px-6">
        <SectionHead eyebrow="Insights" title="From our experts" cta={{ label: "Read the blog", to: "/blog" }} />
        <div className="grid gap-6 md:grid-cols-3">
          {posts.map((p) => (
            <Link key={p.slug} to="/blog/$slug" params={{ slug: p.slug }} className="group">
              <Card className="overflow-hidden transition-shadow hover:shadow-elev-2">
                {p.cover_url ? (
                  <img src={p.cover_url} alt={p.title} className="aspect-[16/9] w-full object-cover" loading="lazy" />
                ) : (
                  <div className="aspect-[16/9] w-full bg-gradient-to-br from-primary/10 to-accent/10" />
                )}
                <div className="p-5">
                  <div className="font-semibold group-hover:text-primary">{p.title}</div>
                  {p.excerpt && <div className="mt-1 line-clamp-3 text-sm text-muted-foreground">{p.excerpt}</div>}
                </div>
              </Card>
            </Link>
          ))}
          {posts.length === 0 && <EmptyState label="Articles will appear here once published from the CMS." />}
        </div>
      </section>

      {/* Big CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-20 lg:px-6">
        <div className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-primary/10 via-background to-accent/10 p-10 text-center md:p-16">
          <div className="mb-3 flex justify-center text-[color:var(--gold)]">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="h-4 w-4 fill-current" />
            ))}
          </div>
          <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">Start your care journey today</h2>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
            Book a free consultation with a certified doctor. We'll design a personalised plan for you.
          </p>
          <Link to="/book">
            <Button size="lg" className="mt-8">Book a free consultation</Button>
          </Link>
        </div>
      </section>
    </>
  );
}

function StatTile({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl border bg-card/80 p-5 backdrop-blur">
      <div className="font-display text-3xl font-semibold text-foreground">{value}</div>
      <div className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}

function SectionHead({
  eyebrow,
  title,
  subtitle,
  cta,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  cta?: { label: string; to: string };
}) {
  return (
    <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
      <div>
        <div className="text-xs font-semibold uppercase tracking-wider text-primary">{eyebrow}</div>
        <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight md:text-4xl">{title}</h2>
        {subtitle && <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {cta && (
        <Link to={cta.to} className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
          {cta.label} <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="col-span-full rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
      {label}
    </div>
  );
}

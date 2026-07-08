/**
 * CMS Block Renderer
 * Maps block.type -> React component. Blocks are stored as
 *   { id, type, data } in cms_pages.blocks / cms_blog_posts.body_blocks.
 */
import type * as React from "react";
import { Link } from "@tanstack/react-router";
import { Sparkles, Check, Star, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export type CmsBlock = { id: string; type: string; data: Record<string, unknown> };
type BlockProps<T = Record<string, unknown>> = { data: T };

const asStr = (v: unknown, d = ""): string => (typeof v === "string" ? v : d);
const asArr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

function Hero({ data }: BlockProps) {
  const eyebrow = asStr(data.eyebrow);
  const title = asStr(data.title, "Welcome");
  const subtitle = asStr(data.subtitle);
  const primaryCta = data.primary_cta as { label?: string; href?: string } | undefined;
  const secondaryCta = data.secondary_cta as { label?: string; href?: string } | undefined;
  const image = asStr(data.image_url);
  return (
    <section className="relative overflow-hidden border-b bg-gradient-to-b from-background via-background to-muted/30">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-2 md:items-center lg:px-6 lg:py-24">
        <div>
          {eyebrow && (
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border bg-card/60 px-3 py-1 text-xs font-medium text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5" /> {eyebrow}
            </div>
          )}
          <h1 className="font-display text-4xl font-semibold tracking-tight text-foreground md:text-5xl lg:text-6xl">
            {title}
          </h1>
          {subtitle && <p className="mt-5 max-w-xl text-base text-muted-foreground md:text-lg">{subtitle}</p>}
          <div className="mt-8 flex flex-wrap gap-3">
            {primaryCta?.label && (
              <Button size="lg" asChild>
                <a href={primaryCta.href ?? "#"}>{primaryCta.label}</a>
              </Button>
            )}
            {secondaryCta?.label && (
              <Button size="lg" variant="outline" asChild>
                <a href={secondaryCta.href ?? "#"}>{secondaryCta.label}</a>
              </Button>
            )}
          </div>
        </div>
        {image && (
          <div className="relative">
            <img
              src={image}
              alt={title}
              className="aspect-[4/3] w-full rounded-2xl object-cover shadow-elev-2"
              loading="eager"
            />
          </div>
        )}
      </div>
    </section>
  );
}

function FeatureGrid({ data }: BlockProps) {
  const title = asStr(data.title);
  const items = asArr<{ title: string; description?: string; icon?: string }>(data.items);
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 lg:px-6">
      {title && <h2 className="mb-10 text-center font-display text-3xl font-semibold tracking-tight">{title}</h2>}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {items.map((f, i) => (
          <Card key={i} className="p-6">
            <div className="mb-4 grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
              <Check className="h-5 w-5" />
            </div>
            <h3 className="mb-2 font-semibold text-foreground">{f.title}</h3>
            {f.description && <p className="text-sm text-muted-foreground">{f.description}</p>}
          </Card>
        ))}
      </div>
    </section>
  );
}

function Cta({ data }: BlockProps) {
  const title = asStr(data.title, "Ready to get started?");
  const subtitle = asStr(data.subtitle);
  const cta = data.cta as { label?: string; href?: string } | undefined;
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 lg:px-6">
      <div className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-primary/10 via-background to-accent/10 p-10 text-center md:p-16">
        <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">{title}</h2>
        {subtitle && <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">{subtitle}</p>}
        {cta?.label && (
          <Button size="lg" className="mt-8" asChild>
            <a href={cta.href ?? "#"}>{cta.label}</a>
          </Button>
        )}
      </div>
    </section>
  );
}

function Testimonials({ data }: BlockProps) {
  const items = asArr<{ quote: string; name: string; role?: string; avatar?: string }>(data.items);
  const title = asStr(data.title, "What our clients say");
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 lg:px-6">
      <h2 className="mb-10 text-center font-display text-3xl font-semibold tracking-tight">{title}</h2>
      <div className="grid gap-6 md:grid-cols-3">
        {items.map((t, i) => (
          <Card key={i} className="p-6">
            <div className="mb-3 flex text-[color:var(--gold)]">
              {Array.from({ length: 5 }).map((_, j) => (
                <Star key={j} className="h-4 w-4 fill-current" />
              ))}
            </div>
            <p className="text-sm leading-relaxed text-foreground">"{t.quote}"</p>
            <div className="mt-4 flex items-center gap-3">
              {t.avatar && <img src={t.avatar} alt={t.name} className="h-10 w-10 rounded-full object-cover" />}
              <div>
                <div className="text-sm font-semibold">{t.name}</div>
                {t.role && <div className="text-xs text-muted-foreground">{t.role}</div>}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}

function Faq({ data }: BlockProps) {
  const title = asStr(data.title, "Frequently asked questions");
  const items = asArr<{ q: string; a: string }>(data.items);
  return (
    <section className="mx-auto max-w-3xl px-4 py-16 lg:px-6">
      <h2 className="mb-8 text-center font-display text-3xl font-semibold tracking-tight">{title}</h2>
      <Accordion type="single" collapsible className="w-full">
        {items.map((f, i) => (
          <AccordionItem key={i} value={`i-${i}`}>
            <AccordionTrigger className="text-left">
              <span className="flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-muted-foreground" /> {f.q}
              </span>
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground">{f.a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}

function Stats({ data }: BlockProps) {
  const items = asArr<{ value: string; label: string }>(data.items);
  return (
    <section className="border-y bg-muted/30">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-12 md:grid-cols-4 lg:px-6">
        {items.map((s, i) => (
          <div key={i} className="text-center">
            <div className="font-display text-3xl font-semibold text-foreground md:text-4xl">{s.value}</div>
            <div className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Media({ data }: BlockProps) {
  const src = asStr(data.src);
  const alt = asStr(data.alt);
  const caption = asStr(data.caption);
  if (!src) return null;
  return (
    <figure className="mx-auto my-8 max-w-4xl px-4">
      <img src={src} alt={alt} className="w-full rounded-2xl object-cover shadow-elev-1" loading="lazy" />
      {caption && <figcaption className="mt-2 text-center text-xs text-muted-foreground">{caption}</figcaption>}
    </figure>
  );
}

function RichText({ data }: BlockProps) {
  const html = asStr(data.html);
  return (
    <div
      className="mx-auto max-w-3xl px-4 py-6 prose prose-neutral dark:prose-invert"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: CMS-authored content
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function LogoCloud({ data }: BlockProps) {
  const items = asArr<{ src: string; alt: string }>(data.items);
  const title = asStr(data.title);
  return (
    <section className="border-y bg-muted/20">
      <div className="mx-auto max-w-6xl px-4 py-10 lg:px-6">
        {title && <div className="mb-6 text-center text-xs uppercase tracking-wider text-muted-foreground">{title}</div>}
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-6 opacity-70">
          {items.map((l, i) => (
            <img key={i} src={l.src} alt={l.alt} className="h-8 w-auto object-contain" loading="lazy" />
          ))}
        </div>
      </div>
    </section>
  );
}

function Pricing({ data }: BlockProps) {
  const items = asArr<{ name: string; price: string; period?: string; features: string[]; cta?: { label: string; href: string }; highlighted?: boolean }>(data.items);
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 lg:px-6">
      <div className="grid gap-6 md:grid-cols-3">
        {items.map((p, i) => (
          <Card key={i} className={`p-8 ${p.highlighted ? "ring-2 ring-primary" : ""}`}>
            <div className="text-sm font-medium text-muted-foreground">{p.name}</div>
            <div className="mt-3 flex items-baseline gap-1">
              <div className="font-display text-4xl font-semibold">{p.price}</div>
              {p.period && <div className="text-sm text-muted-foreground">/{p.period}</div>}
            </div>
            <ul className="mt-6 space-y-2 text-sm">
              {p.features.map((f, j) => (
                <li key={j} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 text-primary" /> {f}
                </li>
              ))}
            </ul>
            {p.cta?.label && (
              <Button className="mt-6 w-full" variant={p.highlighted ? "default" : "outline"} asChild>
                <a href={p.cta.href}>{p.cta.label}</a>
              </Button>
            )}
          </Card>
        ))}
      </div>
    </section>
  );
}

function DoctorList({ data }: BlockProps) {
  const items = asArr<{ name: string; title?: string; photo_url?: string; slug: string }>(data.items);
  const title = asStr(data.title, "Meet our doctors");
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 lg:px-6">
      <h2 className="mb-10 font-display text-3xl font-semibold tracking-tight">{title}</h2>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((d) => (
          <Link key={d.slug} to="/doctors/$slug" params={{ slug: d.slug }} className="group">
            <Card className="overflow-hidden transition-shadow hover:shadow-elev-2">
              {d.photo_url && <img src={d.photo_url} alt={d.name} className="aspect-square w-full object-cover" loading="lazy" />}
              <div className="p-4">
                <div className="font-semibold group-hover:text-primary">{d.name}</div>
                {d.title && <div className="text-xs text-muted-foreground">{d.title}</div>}
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}

function TreatmentList({ data }: BlockProps) {
  const items = asArr<{ name: string; summary?: string; cover_url?: string; slug: string }>(data.items);
  const title = asStr(data.title, "Our treatments");
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 lg:px-6">
      <h2 className="mb-10 font-display text-3xl font-semibold tracking-tight">{title}</h2>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((t) => (
          <Link key={t.slug} to="/treatments/$slug" params={{ slug: t.slug }} className="group">
            <Card className="overflow-hidden transition-shadow hover:shadow-elev-2">
              {t.cover_url && <img src={t.cover_url} alt={t.name} className="aspect-[4/3] w-full object-cover" loading="lazy" />}
              <div className="p-5">
                <div className="font-semibold group-hover:text-primary">{t.name}</div>
                {t.summary && <div className="mt-1 line-clamp-2 text-sm text-muted-foreground">{t.summary}</div>}
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}

function ProductList({ data }: BlockProps) {
  const items = asArr<{ name: string; short_description?: string; cover_url?: string; slug: string; price?: number; currency?: string }>(data.items);
  const title = asStr(data.title, "Featured products");
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 lg:px-6">
      <h2 className="mb-10 font-display text-3xl font-semibold tracking-tight">{title}</h2>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((p) => (
          <Link key={p.slug} to="/products/$slug" params={{ slug: p.slug }} className="group">
            <Card className="overflow-hidden transition-shadow hover:shadow-elev-2">
              {p.cover_url && <img src={p.cover_url} alt={p.name} className="aspect-square w-full object-cover" loading="lazy" />}
              <div className="p-4">
                <div className="font-semibold group-hover:text-primary">{p.name}</div>
                {p.price != null && <div className="mt-1 text-sm text-primary">{p.currency ?? "INR"} {p.price}</div>}
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}

const REGISTRY: Record<string, (p: BlockProps) => React.ReactElement | null> = {
  hero: Hero,
  feature_grid: FeatureGrid,
  cta: Cta,
  testimonials: Testimonials,
  faq: Faq,
  stats: Stats,
  media: Media,
  rich_text: RichText,
  logo_cloud: LogoCloud,
  pricing: Pricing,
  doctor_list: DoctorList,
  treatment_list: TreatmentList,
  product_list: ProductList,
};

export function BlockRenderer({ blocks }: { blocks: CmsBlock[] }) {
  return (
    <>
      {blocks.map((b) => {
        const Comp = REGISTRY[b.type];
        if (!Comp) return null;
        return <Comp key={b.id} data={b.data} />;
      })}
    </>
  );
}

export const BLOCK_REGISTRY_KEYS = Object.keys(REGISTRY);

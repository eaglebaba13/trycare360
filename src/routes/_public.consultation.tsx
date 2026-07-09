import { createFileRoute, Link } from "@tanstack/react-router";
import { Sparkles, Scissors, Sun, Hand, Salad } from "lucide-react";

export const Route = createFileRoute("/_public/consultation")({
  head: () => ({
    meta: [
      { title: "AI Digital Consultation | TryCare360" },
      { name: "description", content: "Free AI-powered hair, skin, nail and nutrition consultation. Get instant analysis, expert recommendations and a plan tailored to you." },
      { property: "og:title", content: "AI Digital Consultation | TryCare360" },
      { property: "og:description", content: "Free AI-powered hair, skin, nail and nutrition consultation." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ConsultationLanding,
});

const CONCERNS = [
  { code: "hair_v1", category: "hair", icon: Scissors, title: "Hair & Scalp", desc: "Hair fall, thinning, dandruff, hairline, density", accent: "from-emerald-500/10 to-emerald-500/0" },
  { code: "skin_v1", category: "skin", icon: Sun, title: "Skin Analysis", desc: "Acne, pigmentation, melasma, wrinkles, dryness", accent: "from-amber-500/10 to-amber-500/0" },
  { code: "nail_v1", category: "nail", icon: Hand, title: "Nail Health", desc: "Strength, colour, ridges, nutrition indicators", accent: "from-sky-500/10 to-sky-500/0" },
  { code: "nutrition_v1", category: "nutrition", icon: Salad, title: "Nutrition & Lifestyle", desc: "BMI, diet, sleep, stress, exercise", accent: "from-rose-500/10 to-rose-500/0" },
];

function ConsultationLanding() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <div className="mx-auto max-w-2xl text-center">
        <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary">
          <Sparkles className="h-3.5 w-3.5" /> AI-powered • Free • Private
        </div>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Your digital consultation, in minutes.</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Answer a guided questionnaire, upload optional photos, and receive an instant AI analysis with expert-curated
          treatment, product and doctor recommendations from TryCare360.
        </p>
      </div>

      <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {CONCERNS.map((c) => (
          <Link
            key={c.code}
            to="/consultation/$category"
            params={{ category: c.category }}
            className={`group relative overflow-hidden rounded-2xl border bg-gradient-to-br ${c.accent} p-6 transition-all hover:-translate-y-1 hover:shadow-xl`}
          >
            <c.icon className="h-9 w-9 text-primary" />
            <h3 className="mt-4 text-lg font-semibold">{c.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{c.desc}</p>
            <div className="mt-6 text-sm font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
              Start free consultation →
            </div>
          </Link>
        ))}
      </div>

      <ol className="mx-auto mt-20 grid max-w-4xl gap-6 sm:grid-cols-4">
        {["Choose concern", "Guided questions", "Optional photos", "Instant AI plan"].map((s, i) => (
          <li key={s} className="flex flex-col items-center text-center">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground font-semibold">
              {i + 1}
            </span>
            <span className="mt-2 text-sm font-medium">{s}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { HeartPulse, ShieldCheck, Sparkles, Users } from "lucide-react";

export const Route = createFileRoute("/_public/about")({
  component: AboutPage,
  head: () => ({
    meta: [
      { title: "About TryCare360" },
      { name: "description", content: "TryCare360 is an integrated healthcare network built around science, empathy and outcomes." },
      { property: "og:title", content: "About TryCare360" },
      { property: "og:description", content: "Integrated healthcare built around science, empathy and outcomes." },
    ],
    links: [{ rel: "canonical", href: "https://trycare360.lovable.app/about" }],
  }),
});

function AboutPage() {
  return (
    <div>
      <section className="border-b bg-gradient-to-b from-muted/30 to-background">
        <div className="mx-auto max-w-4xl px-4 py-20 text-center lg:px-6">
          <div className="text-xs font-semibold uppercase tracking-wider text-primary">Our story</div>
          <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight md:text-5xl">
            Care that actually cares
          </h1>
          <p className="mt-4 text-muted-foreground">
            TryCare360 exists to make evidence-based hair, skin, nail and nutrition care accessible to everyone —
            with the warmth of a clinic and the intelligence of a modern platform.
          </p>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-4 py-16 lg:px-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: ShieldCheck, title: "Doctor-led", body: "Every plan is designed and supervised by certified specialists." },
            { icon: HeartPulse, title: "Outcome-first", body: "We track results and iterate. If something isn't working, we change it." },
            { icon: Sparkles, title: "Personalised", body: "No two bodies are alike. Neither are our protocols." },
            { icon: Users, title: "Together", body: "You're never alone. Care coordinators walk with you every step." },
          ].map((v) => (
            <Card key={v.title} className="p-6">
              <div className="mb-4 grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
                <v.icon className="h-5 w-5" />
              </div>
              <div className="font-semibold">{v.title}</div>
              <p className="mt-1 text-sm text-muted-foreground">{v.body}</p>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}

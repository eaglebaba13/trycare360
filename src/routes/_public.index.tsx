import { createFileRoute } from "@tanstack/react-router";
import { DrHairSubNav, DrHairThemeScope } from "@/components/dr-hair/ui";
import { DrHairLanding } from "./_public.dr-hair.index";

export const Route = createFileRoute("/_public/")({
  head: () => ({
    meta: [
      { title: "Dr Hair — AI Hair Analysis & Personalized Treatment | TryCare360" },
      {
        name: "description",
        content:
          "Free AI-powered hair test with dermatologist-reviewed, personalized treatment plans delivered to your door. Powered by TryCare360.",
      },
      { property: "og:title", content: "Dr Hair — AI Hair Analysis by TryCare360" },
      { property: "og:description", content: "Start your free hair test and get a personalized, doctor-reviewed treatment plan." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://trycare360.lovable.app/" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://trycare360.lovable.app/" }],
  }),
  component: HomePage,
});

function HomePage() {
  return (
    <DrHairThemeScope>
      <DrHairSubNav />
      <DrHairLanding />
    </DrHairThemeScope>
  );
}

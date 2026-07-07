import { createFileRoute, Link } from "@tanstack/react-router";
import { PageContainer } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Database, Map, Building2, Settings2, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/settings/")({
  component: SettingsOverview,
});

const SECTIONS = [
  {
    to: "/settings/masters",
    icon: Database,
    title: "Master Lists",
    body: "Every dropdown value the platform uses — statuses, categories, payment modes, lead stages, tax rates. Fully database-driven.",
  },
  {
    to: "/settings/territory",
    icon: Map,
    title: "Territory",
    body: "Country → State → District → City → Area → PIN Code hierarchy used across CRM, franchise, billing and delivery.",
  },
  {
    to: "/settings/companies",
    icon: Building2,
    title: "Companies & Branches",
    body: "Multi-company, multi-brand, multi-GST setup. Bank accounts, addresses and operating branches per company.",
  },
  {
    to: "/settings/global",
    icon: Settings2,
    title: "Global Settings",
    body: "Tenant-wide key/value settings. Feature toggles, defaults, integration switches.",
  },
];

function SettingsOverview() {
  return (
    <PageContainer
      title="Configuration"
      description="Central settings engine. Everything below is read by future modules — no hardcoded business values anywhere in the platform."
    >
      <div className="grid gap-4 md:grid-cols-2">
        {SECTIONS.map((s) => {
          const Icon = s.icon;
          return (
            <Link key={s.to} to={s.to} className="block">
              <Card className="h-full transition-colors hover:border-primary/50 hover:bg-accent/30">
                <CardHeader className="flex flex-row items-start gap-3 pb-3">
                  <div className="h-10 w-10 rounded-md bg-primary/10 text-primary grid place-items-center">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-base flex items-center justify-between">
                      {s.title}
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{s.body}</p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </PageContainer>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Building2,
  Users,
  Layers,
  Network,
  Landmark,
  Store,
  MapPin,
  Sparkles,
  Boxes,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { PageContainer } from "@/components/app-shell";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { orgSummary } from "@/lib/api/organization.functions";

export const Route = createFileRoute("/_authenticated/organization/")({
  component: OrgOverview,
});

function OrgOverview() {
  const fn = useServerFn(orgSummary);
  const { data } = useQuery({ queryKey: ["org-summary"], queryFn: () => fn({}) });

  const kpis: {
    label: string;
    value: number | undefined;
    icon: typeof Building2;
    accent: string;
  }[] = [
    { label: "Companies", value: data?.companies, icon: Building2, accent: "text-blue-500" },
    { label: "Brands", value: data?.brands, icon: Sparkles, accent: "text-fuchsia-500" },
    { label: "Tenants", value: data?.tenants, icon: Boxes, accent: "text-cyan-500" },
    { label: "Org Units", value: data?.orgUnits, icon: Network, accent: "text-violet-500" },
    { label: "Corporate", value: data?.corporate, icon: Landmark, accent: "text-amber-500" },
    { label: "State Master", value: data?.stateMaster, icon: MapPin, accent: "text-emerald-500" },
    { label: "City Franchise", value: data?.cityFranchise, icon: Store, accent: "text-orange-500" },
    { label: "Advanced Centers", value: data?.advancedCenters, icon: ShieldCheck, accent: "text-teal-500" },
    { label: "Express Centers", value: data?.expressCenters, icon: ShieldCheck, accent: "text-lime-500" },
    { label: "Departments", value: data?.departments, icon: Layers, accent: "text-pink-500" },
    { label: "Employees", value: data?.employees, icon: UserRound, accent: "text-indigo-500" },
    { label: "Total Users", value: undefined, icon: Users, accent: "text-slate-500" },
  ];

  return (
    <PageContainer
      title="Organization Dashboard"
      description="Live counts across every level of the platform hierarchy. Everything is data-driven — no hardcoded totals."
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <Card key={k.label} className="border-border/60">
              <CardHeader className="pb-2 flex flex-row items-center gap-2">
                <div className={`h-8 w-8 rounded-md bg-muted grid place-items-center ${k.accent}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground">
                  {k.label}
                </div>
              </CardHeader>
              <CardContent>
                <div className="font-display text-3xl font-semibold">
                  {k.value ?? "—"}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </PageContainer>
  );
}

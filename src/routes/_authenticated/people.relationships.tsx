import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PageContainer } from "@/components/app-shell";
import { FilterBar } from "@/components/standards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useTenant } from "@/hooks/use-tenant";
import { quickSearchPersons } from "@/lib/identity/services.functions";
import { initials } from "@/lib/standards-format";
import { Users, Heart, Baby, PhoneCall } from "lucide-react";

export const Route = createFileRoute("/_authenticated/people/relationships")({
  component: RelationshipManagerPage,
});

function RelationshipManagerPage() {
  const { activeTenantId } = useTenant();
  const [query, setQuery] = useState("");
  const searchFn = useServerFn(quickSearchPersons);
  const q = useQuery({
    queryKey: ["rel-search", activeTenantId, query],
    queryFn: () => searchFn({ data: { tenant_id: activeTenantId!, query, limit: 8 } }),
    enabled: !!activeTenantId && query.length >= 2,
  });

  return (
    <PageContainer title="Relationship manager" description="Visualize and manage family, guardian, spouse, and emergency contact links.">
      <div className="space-y-4">
        <FilterBar search={query} onSearchChange={setQuery} placeholder="Search a person to view relationships…" />

        {query.length < 2 && (
          <div className="grid gap-3 md:grid-cols-4">
            <LegendCard icon={Users} label="Family" tone="text-sky-600" />
            <LegendCard icon={Heart} label="Spouse" tone="text-rose-500" />
            <LegendCard icon={Baby} label="Children" tone="text-emerald-600" />
            <LegendCard icon={PhoneCall} label="Emergency contact" tone="text-amber-600" />
          </div>
        )}

        {q.data && q.data.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Select a person</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 md:grid-cols-2">
              {q.data.map((r) => (
                <div key={r.id} className="flex items-center gap-3 rounded-md border p-3">
                  <Avatar className="h-9 w-9"><AvatarFallback>{initials(r.full_name)}</AvatarFallback></Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{r.full_name}</div>
                    <div className="text-xs text-muted-foreground truncate">{r.phone_e164 ?? r.email_normalized ?? r.id.slice(0, 8)}</div>
                  </div>
                  <Badge variant="outline">Open tree</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle className="text-base">Family tree</CardTitle></CardHeader>
          <CardContent>
            <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
              Interactive family tree visualization is scaffolded here.
              Nodes will render guardians, spouse, children, and emergency contacts
              using the existing <code className="font-mono">person_relationships</code> data.
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}

function LegendCard({ icon: Icon, label, tone }: { icon: React.ElementType; label: string; tone: string }) {
  return (
    <Card>
      <CardContent className="pt-6 flex items-center gap-3">
        <Icon className={`h-5 w-5 ${tone}`} />
        <div className="text-sm font-medium">{label}</div>
      </CardContent>
    </Card>
  );
}

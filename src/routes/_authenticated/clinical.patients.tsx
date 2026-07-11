/**
 * Clinical → Patients (search entry-point).
 *
 * Reuses the identity search server function to select a patient,
 * then routes into the Encounter Workspace. No new business logic,
 * no duplicate directory.
 */
import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Search } from "lucide-react";
import { PageContainer } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ClinicalHeader } from "@/components/clinical/workspace-shell";
import { useTenant } from "@/hooks/use-tenant";
import { quickSearchPersons } from "@/lib/identity/services.functions";
import { initials } from "@/lib/standards-format";

export const Route = createFileRoute("/_authenticated/clinical/patients")({
  component: ClinicalPatientsPage,
});

function ClinicalPatientsPage() {
  const { activeTenantId } = useTenant();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const fn = useServerFn(quickSearchPersons);
  const searchQ = useQuery({
    queryKey: ["clinical-patients-search", activeTenantId, q],
    queryFn: () => fn({ data: { tenant_id: activeTenantId!, query: q, limit: 20 } }),
    enabled: Boolean(activeTenantId && q.trim().length >= 2),
    staleTime: 15_000,
  });
  return (
    <PageContainer>
      <ClinicalHeader title="Patients" subtitle="Open a patient to start or resume an encounter." />
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Search</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search patient by name, phone, email…"
              className="pl-9 h-11"
            />
          </div>
          <ul className="divide-y">
            {(searchQ.data ?? []).map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() =>
                    navigate({ to: "/clinical/encounter/$id", params: { id: r.id } })
                  }
                  className="w-full text-left flex items-center gap-3 py-2 px-2 rounded-md hover:bg-muted/40"
                >
                  <Avatar className="h-9 w-9">
                    {r.photo_url && <AvatarImage src={r.photo_url} alt={r.full_name} />}
                    <AvatarFallback>{initials(r.full_name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{r.full_name}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {r.phone_e164 ?? r.email_normalized ?? "—"}
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] uppercase">
                    {r.identity_status}
                  </Badge>
                </button>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </PageContainer>
  );
}

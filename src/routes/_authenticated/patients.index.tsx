/**
 * Patient Search / Directory
 * ------------------------------------------------------------------
 * Entry point to the Patient 360 workspace. Uses existing search
 * server functions — no new business logic. Supports global search,
 * recent patients (local), and MRN/QR shortcut inputs.
 */
import { useState, useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Search, QrCode, Hash, Star, Clock } from "lucide-react";
import { PageContainer } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useTenant } from "@/hooks/use-tenant";
import { quickSearchPersons } from "@/lib/identity/services.functions";
import { initials } from "@/lib/standards-format";

const RECENT_KEY = "patient360.recent";
const FAV_KEY = "patient360.favorites";

function readList(key: string): string[] {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "[]") as string[];
  } catch {
    return [];
  }
}

export const Route = createFileRoute("/_authenticated/patients/")({
  component: PatientDirectory,
});

function PatientDirectory() {
  const { activeTenantId } = useTenant();
  const navigate = useNavigate();
  const quickSearchFn = useServerFn(quickSearchPersons);
  const [q, setQ] = useState("");
  const [mrnOrId, setMrnOrId] = useState("");
  const [recent, setRecent] = useState<string[]>([]);
  const [favs, setFavs] = useState<string[]>([]);

  useEffect(() => {
    setRecent(readList(RECENT_KEY));
    setFavs(readList(FAV_KEY));
  }, []);

  const searchQ = useQuery({
    queryKey: ["patient-search", activeTenantId, q],
    queryFn: () => quickSearchFn({ data: { tenant_id: activeTenantId!, query: q, limit: 20 } }),
    enabled: !!activeTenantId && q.trim().length >= 2,
    staleTime: 15_000,
  });

  const goto = (id: string) => {
    const next = [id, ...recent.filter((r) => r !== id)].slice(0, 10);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    navigate({ to: "/patients/$personId", params: { personId: id } });
  };

  return (
    <PageContainer title="Patient 360" description="Central operating workspace for every patient interaction.">
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <Card>
            <CardContent className="pt-6 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  autoFocus
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search patients by name, phone, email…"
                  className="pl-9 h-11 text-base"
                />
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                <form
                  className="flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (mrnOrId.trim()) goto(mrnOrId.trim());
                  }}
                >
                  <div className="relative flex-1">
                    <Hash className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={mrnOrId}
                      onChange={(e) => setMrnOrId(e.target.value)}
                      placeholder="MRN or Patient ID"
                      className="pl-8 h-9"
                    />
                  </div>
                  <Button type="submit" variant="outline" size="sm">Open</Button>
                </form>
                <Button variant="outline" size="sm" className="justify-start gap-2" disabled>
                  <QrCode className="h-4 w-4" /> Scan QR (coming soon)
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">
                {q.trim().length >= 2 ? `Results (${searchQ.data?.length ?? 0})` : "Start typing to search"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {searchQ.isLoading && <div className="text-sm text-muted-foreground">Searching…</div>}
              {!searchQ.isLoading && (searchQ.data?.length ?? 0) === 0 && q.trim().length >= 2 && (
                <div className="text-sm text-muted-foreground py-8 text-center">No patients matched.</div>
              )}
              <ul className="divide-y">
                {(searchQ.data ?? []).map((r) => (
                  <li key={r.entity_id}>
                    <button
                      onClick={() => goto(r.entity_id)}
                      className="w-full text-left flex items-center gap-3 py-2.5 hover:bg-muted/40 rounded-md px-2"
                    >
                      <Avatar className="h-9 w-9">
                        <AvatarFallback>{initials(r.title)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate">{r.title}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {r.subtitle ?? r.entity_type}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px] uppercase">{r.entity_type}</Badge>
                    </button>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2"><Clock className="h-4 w-4" /> Recent</CardTitle>
            </CardHeader>
            <CardContent>
              {recent.length === 0 ? (
                <p className="text-xs text-muted-foreground">Patients you open will appear here.</p>
              ) : (
                <ul className="space-y-1">
                  {recent.slice(0, 8).map((id) => (
                    <li key={id}>
                      <Link
                        to="/patients/$personId"
                        params={{ personId: id }}
                        className="block truncate font-mono text-xs text-primary hover:underline"
                      >
                        #{id.slice(0, 8)}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2"><Star className="h-4 w-4" /> Favorites</CardTitle>
            </CardHeader>
            <CardContent>
              {favs.length === 0 ? (
                <p className="text-xs text-muted-foreground">Star a patient from their profile to pin them here.</p>
              ) : (
                <ul className="space-y-1">
                  {favs.map((id) => (
                    <li key={id}>
                      <Link
                        to="/patients/$personId"
                        params={{ personId: id }}
                        className="block truncate font-mono text-xs text-primary hover:underline"
                      >
                        #{id.slice(0, 8)}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}

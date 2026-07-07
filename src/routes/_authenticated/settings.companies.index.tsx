import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PageContainer } from "@/components/app-shell";
import { CrudTable, type FieldSpec } from "@/components/settings/crud-table";
import { Card } from "@/components/ui/card";
import { Building2 } from "lucide-react";
import { listRows } from "@/lib/api/config.functions";
import { useSession } from "@/hooks/use-session";

export const Route = createFileRoute("/_authenticated/settings/companies/")({
  component: CompaniesPage,
});

function CompaniesPage() {
  const { data: session } = useSession();
  const tenantId = session?.profile?.active_tenant_id ?? null;
  const list = useServerFn(listRows);

  const { data: companies = [] } = useQuery({
    queryKey: ["config", "companies", tenantId],
    queryFn: () =>
      list({
        data: {
          table: "companies",
          filters: tenantId ? { tenant_id: tenantId } : undefined,
          orderBy: { column: "display_order" },
        },
      }) as Promise<Array<Record<string, unknown>>>,
    enabled: !!tenantId,
  });

  return (
    <PageContainer
      title="Companies"
      description="Multi-company setup. Each company can have multiple brands, GST registrations, bank accounts, addresses and operating branches."
    >
      {!tenantId && (
        <Card className="p-4 mb-4 bg-destructive/10 text-sm">
          You must have an active tenant to manage companies. Select a tenant from the header switcher.
        </Card>
      )}

      <CrudTable
        table="companies"
        title="All Companies"
        fields={companyFields()}
        filters={tenantId ? { tenant_id: tenantId } : undefined}
        contextValues={{ tenant_id: tenantId }}
        queryKeyExtra={[tenantId]}
        orderBy={{ column: "display_order" }}
        searchKey="legal_name"
      />

      {companies.length > 0 && (
        <div className="mt-6">
          <div className="text-sm font-medium mb-2">Open a company to manage brands, GST, banks, addresses and branches</div>
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {companies.map((c) => (
              <Link
                key={String(c.id)}
                to="/settings/companies/$companyId"
                params={{ companyId: String(c.id) }}
                className="block"
              >
                <Card className="p-4 hover:border-primary/50 hover:bg-accent/30 transition-colors flex items-center gap-3">
                  <div className="h-10 w-10 rounded-md bg-primary/10 text-primary grid place-items-center">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium truncate">
                      {String(c.brand_name || c.legal_name)}
                    </div>
                    <div className="text-xs text-muted-foreground truncate font-mono">
                      {String(c.code)}
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </PageContainer>
  );
}

function companyFields(): FieldSpec[] {
  return [
    { key: "code", label: "Code", type: "text", required: true, width: "120px" },
    { key: "legal_name", label: "Legal Name", type: "text", required: true },
    { key: "brand_name", label: "Brand Name", type: "text" },
    { key: "cin", label: "CIN", type: "text", hideInTable: true },
    { key: "pan", label: "PAN", type: "text", hideInTable: true },
    { key: "tan", label: "TAN", type: "text", hideInTable: true },
    { key: "email", label: "Email", type: "text", hideInTable: true },
    { key: "phone", label: "Phone", type: "text", hideInTable: true },
    { key: "website", label: "Website", type: "text", hideInTable: true },
    { key: "logo_url", label: "Logo URL", type: "text", hideInTable: true },
    { key: "display_order", label: "Order", type: "number", defaultValue: 0, width: "80px" },
    { key: "is_active", label: "Status", type: "boolean", defaultValue: true, width: "100px" },
  ];
}

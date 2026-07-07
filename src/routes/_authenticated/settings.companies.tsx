import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PageContainer } from "@/components/app-shell";
import { CrudTable, type FieldSpec } from "@/components/settings/crud-table";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { ArrowLeft, Building2 } from "lucide-react";
import { listRows } from "@/lib/api/config.functions";
import { useSession } from "@/hooks/use-session";

export const Route = createFileRoute("/_authenticated/settings/companies")({
  component: CompaniesPage,
});

function CompaniesPage() {
  const { data: session } = useSession();
  const tenantId = session?.profile?.active_tenant_id ?? null;
  const params = (useParams({ strict: false }) as { companyId?: string });
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

  const selected = params.companyId
    ? (companies.find((c) => c.id === params.companyId) as Record<string, unknown> | undefined)
    : null;

  if (selected) {
    return <CompanyDetail company={selected} />;
  }

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
        fields={companyFields()}
        filters={tenantId ? { tenant_id: tenantId } : undefined}
        contextValues={{ tenant_id: tenantId }}
        queryKeyExtra={[tenantId]}
        orderBy={{ column: "display_order" }}
        searchKey="legal_name"
        title="All Companies"
      />
      {companies.length > 0 && (
        <div className="mt-4">
          <div className="text-sm text-muted-foreground mb-2">Open a company to manage brands, GST, banks, addresses and branches:</div>
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
                    <div className="font-medium truncate">{String(c.brand_name || c.legal_name)}</div>
                    <div className="text-xs text-muted-foreground truncate font-mono">{String(c.code)}</div>
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

function CompanyDetail({ company }: { company: Record<string, unknown> }) {
  const { data: session } = useSession();
  const tenantId = session?.profile?.active_tenant_id ?? null;
  const companyId = String(company.id);
  const list = useServerFn(listRows);

  const { data: states = [] } = useQuery({
    queryKey: ["config", "states-all"],
    queryFn: () => list({ data: { table: "states", orderBy: { column: "name" } } }) as Promise<Array<{ id: string; name: string }>>,
  });

  return (
    <PageContainer
      title={String(company.brand_name || company.legal_name)}
      description={`Code ${String(company.code)}`}
      actions={
        <Link to="/settings/companies">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        </Link>
      }
    >
      <Tabs defaultValue="brands">
        <TabsList>
          <TabsTrigger value="brands">Brands</TabsTrigger>
          <TabsTrigger value="gst">GST Registrations</TabsTrigger>
          <TabsTrigger value="banks">Bank Accounts</TabsTrigger>
          <TabsTrigger value="addresses">Addresses</TabsTrigger>
          <TabsTrigger value="branches">Branches</TabsTrigger>
        </TabsList>

        <TabsContent value="brands" className="mt-4">
          <CrudTable
            table="brands"
            title="Brands"
            fields={[
              { key: "code", label: "Code", type: "text", required: true, width: "120px" },
              { key: "name", label: "Name", type: "text", required: true },
              { key: "tagline", label: "Tagline", type: "text", hideInTable: true },
              { key: "primary_color", label: "Primary Color", type: "text", hideInTable: true },
              { key: "secondary_color", label: "Secondary Color", type: "text", hideInTable: true },
              { key: "logo_url", label: "Logo URL", type: "text", hideInTable: true },
              { key: "display_order", label: "Order", type: "number", defaultValue: 0, width: "80px" },
              { key: "is_active", label: "Status", type: "boolean", defaultValue: true, width: "100px" },
            ]}
            filters={{ company_id: companyId }}
            contextValues={{ company_id: companyId, tenant_id: tenantId }}
            queryKeyExtra={[companyId]}
            orderBy={{ column: "display_order" }}
          />
        </TabsContent>

        <TabsContent value="gst" className="mt-4">
          <CrudTable
            table="gst_registrations"
            title="GST Registrations"
            fields={[
              { key: "gstin", label: "GSTIN", type: "text", required: true, width: "180px" },
              { key: "legal_name", label: "Legal Name", type: "text" },
              { key: "trade_name", label: "Trade Name", type: "text", hideInTable: true },
              {
                key: "state_id",
                label: "State",
                type: "select",
                options: [{ value: "", label: "—" }, ...states.map((s) => ({ value: s.id, label: s.name }))],
              },
              { key: "is_primary", label: "Primary", type: "boolean", defaultValue: false, width: "100px" },
              { key: "is_active", label: "Status", type: "boolean", defaultValue: true, width: "100px" },
            ]}
            filters={{ company_id: companyId }}
            contextValues={{ company_id: companyId, tenant_id: tenantId }}
            queryKeyExtra={[companyId, states.length]}
          />
        </TabsContent>

        <TabsContent value="banks" className="mt-4">
          <CrudTable
            table="bank_accounts"
            title="Bank Accounts"
            fields={[
              { key: "account_name", label: "Account Name", type: "text", required: true },
              { key: "account_number", label: "Account No.", type: "text", required: true },
              { key: "ifsc", label: "IFSC", type: "text", width: "120px" },
              { key: "bank_name", label: "Bank", type: "text", required: true },
              { key: "branch", label: "Branch", type: "text", hideInTable: true },
              { key: "account_type", label: "Type", type: "text", hideInTable: true },
              { key: "currency_code", label: "Currency", type: "text", defaultValue: "INR", hideInTable: true },
              { key: "is_primary", label: "Primary", type: "boolean", defaultValue: false, width: "100px" },
              { key: "is_active", label: "Status", type: "boolean", defaultValue: true, width: "100px" },
            ]}
            filters={{ company_id: companyId }}
            contextValues={{ company_id: companyId, tenant_id: tenantId }}
            queryKeyExtra={[companyId]}
          />
        </TabsContent>

        <TabsContent value="addresses" className="mt-4">
          <CrudTable
            table="company_addresses"
            title="Addresses"
            fields={[
              { key: "kind", label: "Kind", type: "text", required: true, placeholder: "registered / billing / shipping", width: "140px" },
              { key: "label", label: "Label", type: "text" },
              { key: "line1", label: "Line 1", type: "text", required: true },
              { key: "line2", label: "Line 2", type: "text", hideInTable: true },
              { key: "landmark", label: "Landmark", type: "text", hideInTable: true },
              { key: "pincode", label: "PIN", type: "text", width: "100px" },
              {
                key: "state_id",
                label: "State",
                type: "select",
                hideInTable: true,
                options: [{ value: "", label: "—" }, ...states.map((s) => ({ value: s.id, label: s.name }))],
              },
              { key: "is_primary", label: "Primary", type: "boolean", defaultValue: false, width: "100px" },
              { key: "is_active", label: "Status", type: "boolean", defaultValue: true, width: "100px" },
            ]}
            filters={{ company_id: companyId }}
            contextValues={{ company_id: companyId, tenant_id: tenantId }}
            queryKeyExtra={[companyId, states.length]}
          />
        </TabsContent>

        <TabsContent value="branches" className="mt-4">
          <CrudTable
            table="branches"
            title="Branches"
            fields={[
              { key: "code", label: "Code", type: "text", required: true, width: "120px" },
              { key: "name", label: "Name", type: "text", required: true },
              { key: "phone", label: "Phone", type: "text", hideInTable: true },
              { key: "email", label: "Email", type: "text", hideInTable: true },
              { key: "display_order", label: "Order", type: "number", defaultValue: 0, width: "80px" },
              { key: "is_active", label: "Status", type: "boolean", defaultValue: true, width: "100px" },
            ]}
            filters={{ company_id: companyId }}
            contextValues={{ company_id: companyId, tenant_id: tenantId }}
            queryKeyExtra={[companyId]}
          />
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}

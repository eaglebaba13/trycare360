import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft } from "lucide-react";
import { PageContainer } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CrudTable, type FieldSpec } from "@/components/settings/crud-table";
import { listRows } from "@/lib/api/config.functions";
import { useSession } from "@/hooks/use-session";

export const Route = createFileRoute("/_authenticated/settings/companies/$companyId")({
  component: CompanyDetail,
});

function CompanyDetail() {
  const { companyId } = useParams({ from: "/_authenticated/settings/companies/$companyId" });
  const { data: session } = useSession();
  const tenantId = session?.profile?.active_tenant_id ?? null;
  const list = useServerFn(listRows);

  const { data: company } = useQuery({
    queryKey: ["config", "companies", companyId],
    queryFn: async () => {
      const rows = await list({ data: { table: "companies", filters: { id: companyId } } });
      return (rows as Array<Record<string, unknown>>)[0] ?? null;
    },
  });

  const { data: states = [] } = useQuery({
    queryKey: ["config", "states-all"],
    queryFn: () => list({ data: { table: "states", orderBy: { column: "name" } } }) as Promise<Array<{ id: string; name: string }>>,
  });

  if (!company) {
    return (
      <PageContainer title="Company">
        <Card className="p-6 text-sm text-muted-foreground">Loading…</Card>
      </PageContainer>
    );
  }

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
          <TabsTrigger value="gst">GST</TabsTrigger>
          <TabsTrigger value="banks">Banks</TabsTrigger>
          <TabsTrigger value="addresses">Addresses</TabsTrigger>
          <TabsTrigger value="branches">Branches</TabsTrigger>
        </TabsList>

        <TabsContent value="brands" className="mt-4">
          <CrudTable
            table="brands"
            title="Brands"
            fields={brandFields()}
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
            fields={gstFields(states)}
            filters={{ company_id: companyId }}
            contextValues={{ company_id: companyId, tenant_id: tenantId }}
            queryKeyExtra={[companyId, states.length]}
          />
        </TabsContent>

        <TabsContent value="banks" className="mt-4">
          <CrudTable
            table="bank_accounts"
            title="Bank Accounts"
            fields={bankFields()}
            filters={{ company_id: companyId }}
            contextValues={{ company_id: companyId, tenant_id: tenantId }}
            queryKeyExtra={[companyId]}
          />
        </TabsContent>

        <TabsContent value="addresses" className="mt-4">
          <CrudTable
            table="company_addresses"
            title="Addresses"
            fields={addressFields(states)}
            filters={{ company_id: companyId }}
            contextValues={{ company_id: companyId, tenant_id: tenantId }}
            queryKeyExtra={[companyId, states.length]}
          />
        </TabsContent>

        <TabsContent value="branches" className="mt-4">
          <CrudTable
            table="branches"
            title="Branches"
            fields={branchFields()}
            filters={{ company_id: companyId }}
            contextValues={{ company_id: companyId, tenant_id: tenantId }}
            queryKeyExtra={[companyId]}
          />
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}

function brandFields(): FieldSpec[] {
  return [
    { key: "code", label: "Code", type: "text", required: true, width: "120px" },
    { key: "name", label: "Name", type: "text", required: true },
    { key: "tagline", label: "Tagline", type: "text", hideInTable: true },
    { key: "primary_color", label: "Primary Color", type: "text", hideInTable: true },
    { key: "logo_url", label: "Logo URL", type: "text", hideInTable: true },
    { key: "display_order", label: "Order", type: "number", defaultValue: 0, width: "80px" },
    { key: "is_active", label: "Status", type: "boolean", defaultValue: true, width: "100px" },
  ];
}

function gstFields(states: Array<{ id: string; name: string }>): FieldSpec[] {
  return [
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
  ];
}

function bankFields(): FieldSpec[] {
  return [
    { key: "account_name", label: "Account Name", type: "text", required: true },
    { key: "account_number", label: "Account No.", type: "text", required: true },
    { key: "ifsc", label: "IFSC", type: "text", width: "120px" },
    { key: "bank_name", label: "Bank", type: "text", required: true },
    { key: "branch", label: "Branch", type: "text", hideInTable: true },
    { key: "account_type", label: "Type", type: "text", hideInTable: true },
    { key: "currency_code", label: "Currency", type: "text", defaultValue: "INR", hideInTable: true },
    { key: "is_primary", label: "Primary", type: "boolean", defaultValue: false, width: "100px" },
    { key: "is_active", label: "Status", type: "boolean", defaultValue: true, width: "100px" },
  ];
}

function addressFields(states: Array<{ id: string; name: string }>): FieldSpec[] {
  return [
    { key: "kind", label: "Kind", type: "text", required: true, placeholder: "registered / billing / shipping", width: "160px" },
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
  ];
}

function branchFields(): FieldSpec[] {
  return [
    { key: "code", label: "Code", type: "text", required: true, width: "120px" },
    { key: "name", label: "Name", type: "text", required: true },
    { key: "phone", label: "Phone", type: "text", hideInTable: true },
    { key: "email", label: "Email", type: "text", hideInTable: true },
    { key: "display_order", label: "Order", type: "number", defaultValue: 0, width: "80px" },
    { key: "is_active", label: "Status", type: "boolean", defaultValue: true, width: "100px" },
  ];
}

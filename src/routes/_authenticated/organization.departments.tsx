import { createFileRoute } from "@tanstack/react-router";
import { PageContainer } from "@/components/app-shell";
import { CrudTable, type FieldSpec } from "@/components/settings/crud-table";

export const Route = createFileRoute("/_authenticated/organization/departments")({
  component: DepartmentsPage,
});

const FIELDS: FieldSpec[] = [
  { key: "code", label: "Code", type: "text", required: true, width: "120px" },
  { key: "name", label: "Name", type: "text", required: true },
  {
    key: "kind",
    label: "Kind",
    type: "select",
    options: [
      { value: "hair", label: "Hair" },
      { value: "skin", label: "Skin" },
      { value: "nail", label: "Nail" },
      { value: "nutrition", label: "Nutrition" },
      { value: "doctor", label: "Doctor" },
      { value: "accounts", label: "Accounts" },
      { value: "hr", label: "HR" },
      { value: "marketing", label: "Marketing" },
      { value: "crm", label: "CRM" },
      { value: "inventory", label: "Inventory" },
      { value: "academy", label: "Academy" },
      { value: "diagnostics", label: "Diagnostics" },
      { value: "pharmacy", label: "Pharmacy" },
      { value: "custom", label: "Custom" },
    ],
  },
  { key: "description", label: "Description", type: "textarea", hideInTable: true },
  { key: "display_order", label: "Order", type: "number", defaultValue: 0, width: "80px" },
  { key: "is_active", label: "Active", type: "boolean", defaultValue: true, width: "90px" },
];

function DepartmentsPage() {
  return (
    <PageContainer
      title="Departments"
      description="Functional units inside every organization: Hair, Skin, Nail, Nutrition, Doctor, Accounts, HR, Marketing, CRM, Inventory, Academy, Diagnostics, Pharmacy, and any custom department you add."
    >
      <CrudTable
        table="departments"
        fields={FIELDS}
        orderBy={{ column: "display_order" }}
        title="All departments"
        searchKey="name"
      />
    </PageContainer>
  );
}

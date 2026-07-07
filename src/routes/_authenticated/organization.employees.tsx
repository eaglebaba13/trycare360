import { createFileRoute } from "@tanstack/react-router";
import { PageContainer } from "@/components/app-shell";
import { CrudTable, type FieldSpec } from "@/components/settings/crud-table";

export const Route = createFileRoute("/_authenticated/organization/employees")({
  component: EmployeesPage,
});

const FIELDS: FieldSpec[] = [
  { key: "employee_code", label: "Code", type: "text", required: true, width: "120px" },
  { key: "full_name", label: "Full name", type: "text", required: true },
  { key: "email", label: "Email", type: "text" },
  { key: "phone", label: "Phone", type: "text", hideInTable: true },
  { key: "designation", label: "Designation", type: "text" },
  {
    key: "status",
    label: "Status",
    type: "select",
    defaultValue: "active",
    options: [
      { value: "active", label: "Active" },
      { value: "on_leave", label: "On leave" },
      { value: "suspended", label: "Suspended" },
      { value: "exited", label: "Exited" },
    ],
    width: "120px",
  },
  { key: "joined_at", label: "Joined", type: "text", placeholder: "YYYY-MM-DD", hideInTable: true },
  { key: "is_active", label: "Active", type: "boolean", defaultValue: true, width: "90px" },
];

function EmployeesPage() {
  return (
    <PageContainer
      title="Employees"
      description="Every person working across the platform: employee code, contact info, org unit, department and reporting manager. All values feed into HR, payroll and access control."
    >
      <CrudTable
        table="employees"
        fields={FIELDS}
        orderBy={{ column: "full_name" }}
        title="All employees"
        searchKey="full_name"
      />
    </PageContainer>
  );
}

import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PageContainer } from "@/components/app-shell";
import { DataGrid, FilterBar, BulkActionsBar } from "@/components/standards";
import type { DataGridColumn } from "@/components/standards";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTenant } from "@/hooks/use-tenant";
import { advancedSearchPersons } from "@/lib/identity/services.functions";
import { initials, formatDate } from "@/lib/standards-format";
import type { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/people/list")({
  component: PeopleList,
});

type PersonRow = Tables<"persons">;

function PeopleList() {
  const navigate = useNavigate();
  const { activeTenantId } = useTenant();
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<string>("all");
  const [status, setStatus] = useState<string>("active");
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const limit = 25;

  const searchFn = useServerFn(advancedSearchPersons);
  const q = useQuery({
    queryKey: ["people", "list", activeTenantId, search, role, status, offset],
    queryFn: () =>
      searchFn({
        data: {
          tenant_id: activeTenantId!,
          query: search || undefined,
          role: role === "all" ? undefined : (role as "patient" | "doctor" | "employee" | "franchise_owner" | "academy_student" | "lead" | "corporate_contact" | "vendor_contact"),
          identity_status: status as "active" | "archived" | "merged",
          limit,
          offset,
        },
      }),
    enabled: !!activeTenantId,
  });

  const rows = (q.data?.rows ?? []) as PersonRow[];

  const columns: DataGridColumn<PersonRow>[] = [
    {
      id: "photo",
      header: "",
      width: "56px",
      cell: (r) => (
        <Avatar className="h-8 w-8">
          {r.photo_url && <AvatarImage src={r.photo_url} alt={r.full_name} />}
          <AvatarFallback className="text-xs">{initials(r.full_name)}</AvatarFallback>
        </Avatar>
      ),
    },
    {
      id: "name",
      header: "Name",
      cell: (r) => (
        <div className="min-w-0">
          <div className="font-medium truncate">{r.full_name}</div>
          <div className="text-xs text-muted-foreground truncate">
            {(r.id as string).slice(0, 8)}
            {r.vip_flag ? " • VIP" : ""}
          </div>
        </div>
      ),
    },
    { id: "phone", header: "Phone", cell: (r) => <span className="tabular-nums">{r.phone_e164 ?? "—"}</span> },
    { id: "email", header: "Email", cell: (r) => <span className="truncate">{r.email_normalized ?? "—"}</span> },
    { id: "dob", header: "DOB", cell: (r) => formatDate(r.dob) },
    {
      id: "status",
      header: "Status",
      cell: (r) => (
        <Badge variant={r.identity_status === "active" ? "default" : "secondary"} className="capitalize">
          {r.identity_status}
        </Badge>
      ),
    },
    {
      id: "verified",
      header: "Verified",
      cell: (r) =>
        r.verification_state && r.verification_state !== "unverified" ? (
          <Badge variant="outline" className="capitalize">{r.verification_state}</Badge>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
    { id: "updated", header: "Updated", cell: (r) => formatDate(r.updated_at) },
  ];

  return (
    <PageContainer
      title="People"
      description="Enterprise data grid across the Master Person Registry."
      actions={
        <>
          <Button variant="outline" asChild>
            <Link to="/people/import">Import</Link>
          </Button>
          <Button asChild>
            <Link to="/people/new">New person</Link>
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <FilterBar
          search={search}
          onSearchChange={(v) => {
            setSearch(v);
            setOffset(0);
          }}
          placeholder="Search name, phone or email…"
          onReset={() => {
            setSearch("");
            setRole("all");
            setStatus("active");
            setOffset(0);
          }}
        >
          <Select value={role} onValueChange={(v) => { setRole(v); setOffset(0); }}>
            <SelectTrigger className="w-[160px] h-9"><SelectValue placeholder="Role" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              <SelectItem value="patient">Patient</SelectItem>
              <SelectItem value="doctor">Doctor</SelectItem>
              <SelectItem value="employee">Employee</SelectItem>
              <SelectItem value="franchise_owner">Franchise owner</SelectItem>
              <SelectItem value="academy_student">Academy student</SelectItem>
              <SelectItem value="lead">Lead</SelectItem>
              <SelectItem value="corporate_contact">Corporate contact</SelectItem>
              <SelectItem value="vendor_contact">Vendor contact</SelectItem>
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={(v) => { setStatus(v); setOffset(0); }}>
            <SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
              <SelectItem value="merged">Merged</SelectItem>
            </SelectContent>
          </Select>
        </FilterBar>

        <BulkActionsBar count={selected.size} onClear={() => setSelected(new Set())}>
          <Button variant="outline" size="sm" disabled>Export</Button>
          <Button variant="outline" size="sm" disabled>Tag</Button>
          <Button variant="outline" size="sm" disabled>Archive</Button>
        </BulkActionsBar>

        <DataGrid
          rows={rows}
          columns={columns}
          getRowId={(r) => r.id as string}
          isLoading={q.isLoading}
          onRowClick={(r) => navigate({ to: "/people/$personId", params: { personId: r.id as string } })}
          selectable
          selectedIds={selected}
          onSelectionChange={setSelected}
          pagination={{
            limit,
            offset,
            total: q.data?.total ?? null,
            onOffset: setOffset,
          }}
        />
      </div>
    </PageContainer>
  );
}

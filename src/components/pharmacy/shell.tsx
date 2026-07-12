import type { ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { PermissionGuard } from "@/components/permission-guard";
import { cn } from "@/lib/utils";

export const PHARMACY_TABS = [
  { to: "/pharmacy", label: "Overview", exact: true },
  { to: "/pharmacy/inventory", label: "Inventory" },
  { to: "/pharmacy/batches", label: "Batches" },
  { to: "/pharmacy/expiry", label: "Expiry" },
  { to: "/pharmacy/adjustments", label: "Adjustments" },
  { to: "/pharmacy/transfers", label: "Transfers" },
  { to: "/pharmacy/dispense", label: "Dispense" },
  { to: "/pharmacy/returns", label: "Returns" },
  { to: "/pharmacy/controlled", label: "Controlled" },
  { to: "/pharmacy/purchase", label: "Purchase" },
  { to: "/pharmacy/grn", label: "GRN" },
  { to: "/pharmacy/master", label: "Drug Master" },
  { to: "/pharmacy/warehouses", label: "Warehouses" },
  { to: "/pharmacy/suppliers", label: "Suppliers" },
  { to: "/pharmacy/recalls", label: "Drug Recall" },
  { to: "/pharmacy/coldchain", label: "Cold Chain" },
  { to: "/pharmacy/integrations", label: "Integrations" },
];

export function PharmacyHeader() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Pharmacy Operations</h1>
      <p className="text-sm text-muted-foreground">
        Inventory, batches, expiry, adjustments, transfers, drug master, warehouses & suppliers —
        all backed by the immutable ledger. UI reads from Stage 2 server functions only; no
        client-side inventory math.
      </p>
    </div>
  );
}

export function PharmacySidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="flex flex-wrap gap-1 border-b">
      {PHARMACY_TABS.map((t) => {
        const active = t.exact ? pathname === t.to : pathname.startsWith(t.to);
        return (
          <Link
            key={t.to}
            to={t.to}
            className={cn(
              "px-3 py-2 text-sm border-b-2 -mb-px",
              active
                ? "border-primary text-foreground font-medium"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function PharmacyFilterBar({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2 rounded-md border bg-card p-2">{children}</div>;
}

export function PharmacyActionBar({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center justify-end gap-2">{children}</div>;
}

export function PharmacyShell({ children }: { children: ReactNode }) {
  return (
    <PermissionGuard
      permissions={["pharmacy:read", "pharmacy:write", "pharmacy:dispense", "pharmacy:manage"]}
      fallback={
        <div className="p-8 text-sm text-muted-foreground">
          You don&apos;t have permission to access the Pharmacy workspace.
        </div>
      }
    >
      <div className="space-y-4">
        <PharmacyHeader />
        <PharmacySidebar />
        {children}
      </div>
    </PermissionGuard>
  );
}

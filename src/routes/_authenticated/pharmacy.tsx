import { createFileRoute, Outlet } from "@tanstack/react-router";
import { PharmacyShell } from "@/components/pharmacy/shell";

export const Route = createFileRoute("/_authenticated/pharmacy")({
  component: () => (
    <PharmacyShell>
      <Outlet />
    </PharmacyShell>
  ),
});

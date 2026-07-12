import { createFileRoute, Outlet } from "@tanstack/react-router";
import { LaboratoryShell } from "@/components/laboratory/shell";

export const Route = createFileRoute("/_authenticated/laboratory")({
  component: () => (
    <LaboratoryShell>
      <Outlet />
    </LaboratoryShell>
  ),
});

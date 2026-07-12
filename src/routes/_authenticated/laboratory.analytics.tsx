import { createFileRoute, Outlet } from "@tanstack/react-router";
import { LaboratoryAnalyticsShell } from "@/components/laboratory/analytics";

export const Route = createFileRoute("/_authenticated/laboratory/analytics")({
  component: LaboratoryAnalyticsLayout,
});

function LaboratoryAnalyticsLayout() {
  return (
    <LaboratoryAnalyticsShell>
      <Outlet />
    </LaboratoryAnalyticsShell>
  );
}

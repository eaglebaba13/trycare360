import { createFileRoute, Outlet } from "@tanstack/react-router";
import { PharmacyAnalyticsShell } from "@/components/pharmacy/analytics";

export const Route = createFileRoute("/_authenticated/pharmacy/analytics")({
  component: PharmacyAnalyticsLayout,
});

function PharmacyAnalyticsLayout() {
  return (
    <PharmacyAnalyticsShell>
      <Outlet />
    </PharmacyAnalyticsShell>
  );
}

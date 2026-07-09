import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { TrackingBoot } from "@/components/cms/TrackingBoot";
import { getSiteSettings } from "@/lib/api/cms.functions";

export const Route = createFileRoute("/_public")({
  component: PublicLayout,
});

function PublicLayout() {
  const site = useServerFn(getSiteSettings);
  const { data } = useQuery({ queryKey: ["site-settings"], queryFn: () => site(), staleTime: 300_000 });
  const tracking = (data?.tracking ?? null) as Parameters<typeof TrackingBoot>[0]["tracking"];
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <TrackingBoot tracking={tracking} />
      <SiteHeader />
      <main className="flex-1">
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  );
}

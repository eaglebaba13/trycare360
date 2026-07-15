import { createFileRoute, Outlet } from "@tanstack/react-router";
import { DrHairSubNav, DrHairThemeScope } from "@/components/dr-hair/ui";

export const Route = createFileRoute("/_public/dr-hair")({
  component: DrHairLayout,
});

function DrHairLayout() {
  return (
    <DrHairThemeScope>
      <DrHairSubNav />
      <Outlet />
    </DrHairThemeScope>
  );
}

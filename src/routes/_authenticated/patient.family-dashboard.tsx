import { createFileRoute } from "@tanstack/react-router";
import { FamilyDashboardPage } from "@/components/patient/stage5";
export const Route = createFileRoute("/_authenticated/patient/family-dashboard")({ component: FamilyDashboardPage });

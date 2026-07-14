import { createFileRoute } from "@tanstack/react-router";
import { HealthGoalsPage } from "@/components/patient/stage4";
export const Route = createFileRoute("/_authenticated/patient/health-goals")({ component: HealthGoalsPage });

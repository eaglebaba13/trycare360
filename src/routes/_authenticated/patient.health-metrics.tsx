import { createFileRoute } from "@tanstack/react-router";
import { HealthMetricsPage } from "@/components/patient/stage4";
export const Route = createFileRoute("/_authenticated/patient/health-metrics")({ component: HealthMetricsPage });

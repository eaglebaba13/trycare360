import { createFileRoute } from "@tanstack/react-router";
import { IntegrationsPage } from "@/components/patient/stage5";
export const Route = createFileRoute("/_authenticated/patient/integrations")({ component: IntegrationsPage });

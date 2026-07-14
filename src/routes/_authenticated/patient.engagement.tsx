import { createFileRoute } from "@tanstack/react-router";
import { EngagementPage } from "@/components/patient/stage5";
export const Route = createFileRoute("/_authenticated/patient/engagement")({ component: EngagementPage });

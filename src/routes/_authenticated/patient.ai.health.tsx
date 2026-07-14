import { createFileRoute } from "@tanstack/react-router";
import { AIHealthPage } from "@/components/patient/stage5";
export const Route = createFileRoute("/_authenticated/patient/ai/health")({ component: AIHealthPage });

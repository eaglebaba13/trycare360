import { createFileRoute } from "@tanstack/react-router";
import { AIAssistantPage } from "@/components/patient/stage5";
export const Route = createFileRoute("/_authenticated/patient/ai")({ component: AIAssistantPage });

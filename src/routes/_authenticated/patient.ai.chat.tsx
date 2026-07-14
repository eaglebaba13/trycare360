import { createFileRoute } from "@tanstack/react-router";
import { AIChatPage } from "@/components/patient/stage5";
export const Route = createFileRoute("/_authenticated/patient/ai/chat")({ component: AIChatPage });

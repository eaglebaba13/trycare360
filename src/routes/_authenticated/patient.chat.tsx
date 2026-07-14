import { createFileRoute } from "@tanstack/react-router";
import { ChatPage } from "@/components/patient/stage4";
export const Route = createFileRoute("/_authenticated/patient/chat")({ component: ChatPage });

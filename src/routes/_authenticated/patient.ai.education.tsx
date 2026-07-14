import { createFileRoute } from "@tanstack/react-router";
import { AIEducationPage } from "@/components/patient/stage5";
export const Route = createFileRoute("/_authenticated/patient/ai/education")({ component: AIEducationPage });

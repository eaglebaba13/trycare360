import { createFileRoute } from "@tanstack/react-router";
import { SharePage } from "@/components/patient/stage5";
export const Route = createFileRoute("/_authenticated/patient/share")({ component: SharePage });

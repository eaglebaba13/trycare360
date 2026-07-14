import { createFileRoute } from "@tanstack/react-router";
import { TimelinePage } from "@/components/patient/stage5";
export const Route = createFileRoute("/_authenticated/patient/timeline")({ component: TimelinePage });

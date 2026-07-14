import { createFileRoute } from "@tanstack/react-router";
import { PreVisitPage } from "@/components/patient/stage4";
export const Route = createFileRoute("/_authenticated/patient/previsit")({ component: PreVisitPage });

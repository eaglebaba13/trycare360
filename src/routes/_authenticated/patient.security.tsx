import { createFileRoute } from "@tanstack/react-router";
import { SecurityPage } from "@/components/patient/stage4";
export const Route = createFileRoute("/_authenticated/patient/security")({ component: SecurityPage });

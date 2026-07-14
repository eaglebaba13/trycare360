import { createFileRoute } from "@tanstack/react-router";
import { PatientSupportPage } from "@/components/patient/support";
export const Route = createFileRoute("/_authenticated/patient/support")({ component: PatientSupportPage });

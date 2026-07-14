import { createFileRoute } from "@tanstack/react-router";
import { PatientPathologyPage } from "@/components/patient/reports";
export const Route = createFileRoute("/_authenticated/patient/pathology")({ component: PatientPathologyPage });

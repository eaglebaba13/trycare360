import { createFileRoute } from "@tanstack/react-router";
import { PatientHealthPage } from "@/components/patient/health";
export const Route = createFileRoute("/_authenticated/patient/health")({ component: PatientHealthPage });

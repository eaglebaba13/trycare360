import { createFileRoute } from "@tanstack/react-router";
import { PatientLabPage } from "@/components/patient/reports";
export const Route = createFileRoute("/_authenticated/patient/lab-reports")({ component: PatientLabPage });

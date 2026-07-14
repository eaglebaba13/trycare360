import { createFileRoute } from "@tanstack/react-router";
import { PatientDashboard } from "@/components/patient/dashboard";
export const Route = createFileRoute("/_authenticated/patient/")({ component: PatientDashboard });

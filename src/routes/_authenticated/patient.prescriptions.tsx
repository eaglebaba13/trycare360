import { createFileRoute } from "@tanstack/react-router";
import { PatientPrescriptionsPage } from "@/components/patient/records";
export const Route = createFileRoute("/_authenticated/patient/prescriptions")({ component: PatientPrescriptionsPage });

import { createFileRoute } from "@tanstack/react-router";
import { PatientTeleconsultPage } from "@/components/patient/teleconsult";
export const Route = createFileRoute("/_authenticated/patient/teleconsult")({ component: PatientTeleconsultPage });

import { createFileRoute } from "@tanstack/react-router";
import { PatientPassportPage } from "@/components/patient/passport";
export const Route = createFileRoute("/_authenticated/patient/passport")({ component: PatientPassportPage });

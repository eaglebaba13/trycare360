import { createFileRoute } from "@tanstack/react-router";
import { PatientConsentsPage } from "@/components/patient/passport";
export const Route = createFileRoute("/_authenticated/patient/consents")({ component: PatientConsentsPage });

import { createFileRoute } from "@tanstack/react-router";
import { PatientRecordsPage } from "@/components/patient/records";
export const Route = createFileRoute("/_authenticated/patient/records")({ component: PatientRecordsPage });

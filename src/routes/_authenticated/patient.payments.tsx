import { createFileRoute } from "@tanstack/react-router";
import { PatientPaymentsPage } from "@/components/patient/payments";
export const Route = createFileRoute("/_authenticated/patient/payments")({ component: PatientPaymentsPage });

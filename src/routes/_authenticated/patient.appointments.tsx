import { createFileRoute } from "@tanstack/react-router";
import { PatientAppointmentsPage } from "@/components/patient/appointments";
export const Route = createFileRoute("/_authenticated/patient/appointments")({ component: PatientAppointmentsPage });

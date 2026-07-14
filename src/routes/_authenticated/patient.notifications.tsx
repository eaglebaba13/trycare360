import { createFileRoute } from "@tanstack/react-router";
import { PatientNotificationsPage } from "@/components/patient/notifications";
export const Route = createFileRoute("/_authenticated/patient/notifications")({ component: PatientNotificationsPage });

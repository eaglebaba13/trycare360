import { createFileRoute } from "@tanstack/react-router";
import { PatientSettingsPage } from "@/components/patient/settings";
export const Route = createFileRoute("/_authenticated/patient/settings")({ component: PatientSettingsPage });

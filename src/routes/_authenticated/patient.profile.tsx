import { createFileRoute } from "@tanstack/react-router";
import { PatientProfileWorkspace } from "@/components/patient/profile";
export const Route = createFileRoute("/_authenticated/patient/profile")({ component: PatientProfileWorkspace });

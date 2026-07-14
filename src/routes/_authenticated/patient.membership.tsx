import { createFileRoute } from "@tanstack/react-router";
import { PatientMembershipPage } from "@/components/patient/membership";
export const Route = createFileRoute("/_authenticated/patient/membership")({ component: PatientMembershipPage });

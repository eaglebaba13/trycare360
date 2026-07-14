import { createFileRoute } from "@tanstack/react-router";
import { PatientLoyaltyPage } from "@/components/patient/loyalty";
export const Route = createFileRoute("/_authenticated/patient/loyalty")({ component: PatientLoyaltyPage });

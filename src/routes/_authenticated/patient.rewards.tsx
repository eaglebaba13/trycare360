import { createFileRoute } from "@tanstack/react-router";
import { PatientRewardsPage } from "@/components/patient/rewards";
export const Route = createFileRoute("/_authenticated/patient/rewards")({ component: PatientRewardsPage });

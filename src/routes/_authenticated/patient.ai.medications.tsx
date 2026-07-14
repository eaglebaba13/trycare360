import { createFileRoute } from "@tanstack/react-router";
import { AIMedicationsPage } from "@/components/patient/stage5";
export const Route = createFileRoute("/_authenticated/patient/ai/medications")({ component: AIMedicationsPage });

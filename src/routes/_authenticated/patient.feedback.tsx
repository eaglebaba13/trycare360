import { createFileRoute } from "@tanstack/react-router";
import { PatientFeedbackPage } from "@/components/patient/support";
export const Route = createFileRoute("/_authenticated/patient/feedback")({ component: PatientFeedbackPage });

import { createFileRoute } from "@tanstack/react-router";
import { SelfAssessmentPage } from "@/components/patient/stage4";
export const Route = createFileRoute("/_authenticated/patient/self-assessment")({ component: SelfAssessmentPage });

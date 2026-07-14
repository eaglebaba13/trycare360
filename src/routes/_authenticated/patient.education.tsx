import { createFileRoute } from "@tanstack/react-router";
import { EducationPage } from "@/components/patient/stage4";
export const Route = createFileRoute("/_authenticated/patient/education")({ component: EducationPage });

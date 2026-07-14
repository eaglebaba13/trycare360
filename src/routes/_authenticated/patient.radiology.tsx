import { createFileRoute } from "@tanstack/react-router";
import { PatientRadiologyPage } from "@/components/patient/reports";
export const Route = createFileRoute("/_authenticated/patient/radiology")({ component: PatientRadiologyPage });

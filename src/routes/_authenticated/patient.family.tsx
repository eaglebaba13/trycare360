import { createFileRoute } from "@tanstack/react-router";
import { FamilyWorkspace } from "@/components/patient/family";
export const Route = createFileRoute("/_authenticated/patient/family")({ component: FamilyWorkspace });

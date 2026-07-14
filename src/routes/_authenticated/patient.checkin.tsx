import { createFileRoute } from "@tanstack/react-router";
import { CheckinPage } from "@/components/patient/stage4";
export const Route = createFileRoute("/_authenticated/patient/checkin")({ component: CheckinPage });

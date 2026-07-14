import { createFileRoute } from "@tanstack/react-router";
import { CheckinSuccessPage } from "@/components/patient/stage4";
export const Route = createFileRoute("/_authenticated/patient/checkin/success")({ component: CheckinSuccessPage });

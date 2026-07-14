import { createFileRoute } from "@tanstack/react-router";
import { ConsentReviewPage } from "@/components/patient/stage4";
export const Route = createFileRoute("/_authenticated/patient/consent-review")({ component: ConsentReviewPage });

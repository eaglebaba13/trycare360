import { createFileRoute } from "@tanstack/react-router";
import { MembershipBenefitsPage } from "@/components/patient/stage4";
export const Route = createFileRoute("/_authenticated/patient/membership-benefits")({ component: MembershipBenefitsPage });

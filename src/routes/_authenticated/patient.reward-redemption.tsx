import { createFileRoute } from "@tanstack/react-router";
import { RewardRedemptionPage } from "@/components/patient/stage4";
export const Route = createFileRoute("/_authenticated/patient/reward-redemption")({ component: RewardRedemptionPage });

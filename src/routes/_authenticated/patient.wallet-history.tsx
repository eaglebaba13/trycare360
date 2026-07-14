import { createFileRoute } from "@tanstack/react-router";
import { WalletHistoryPage } from "@/components/patient/stage4";
export const Route = createFileRoute("/_authenticated/patient/wallet-history")({ component: WalletHistoryPage });

import { createFileRoute } from "@tanstack/react-router";
import { PatientWalletPage } from "@/components/patient/wallet";
export const Route = createFileRoute("/_authenticated/patient/wallet")({ component: PatientWalletPage });

import { createFileRoute } from "@tanstack/react-router";
import { MobilePage } from "@/components/patient/stage5";
export const Route = createFileRoute("/_authenticated/patient/mobile")({ component: MobilePage });

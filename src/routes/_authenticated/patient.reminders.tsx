import { createFileRoute } from "@tanstack/react-router";
import { RemindersPage } from "@/components/patient/stage5";
export const Route = createFileRoute("/_authenticated/patient/reminders")({ component: RemindersPage });

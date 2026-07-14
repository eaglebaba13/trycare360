import { createFileRoute } from "@tanstack/react-router";
import { NotificationsCenterPage } from "@/components/patient/stage4";
export const Route = createFileRoute("/_authenticated/patient/notifications-center")({ component: NotificationsCenterPage });

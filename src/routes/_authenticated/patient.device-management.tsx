import { createFileRoute } from "@tanstack/react-router";
import { DeviceManagementPage } from "@/components/patient/stage4";
export const Route = createFileRoute("/_authenticated/patient/device-management")({ component: DeviceManagementPage });

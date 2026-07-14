import { createFileRoute } from "@tanstack/react-router";
import { PushDeviceGrid } from "@/components/patient/notifications";
import { PatientShell } from "@/components/patient/shell";
import { Card, CardContent } from "@/components/ui/card";

function Page() {
  return (
    <PatientShell title="Devices" description="Push notification devices.">
      <Card><CardContent className="pt-4"><PushDeviceGrid /></CardContent></Card>
    </PatientShell>
  );
}
export const Route = createFileRoute("/_authenticated/patient/devices")({ component: Page });

import { createFileRoute } from "@tanstack/react-router";
import { Video } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SchedulerShell } from "@/components/scheduling/scheduler-shell";

export const Route = createFileRoute(
  "/_authenticated/scheduling/integrations/video",
)({
  component: VideoProvidersPage,
});

const PROVIDERS = [
  {
    id: "google_meet",
    name: "Google Meet",
    description:
      "Generates a Meet link on the doctor's Workspace account when the video adapter is wired.",
  },
  {
    id: "zoom",
    name: "Zoom",
    description:
      "Creates a Zoom meeting with the branch's Zoom account when the video adapter is wired.",
  },
];

function VideoProvidersPage() {
  return (
    <SchedulerShell
      title="Video Consultation"
      subtitle="Provider abstraction — meeting metadata lives on the appointment."
    >
      <div className="grid gap-3 md:grid-cols-2">
        {PROVIDERS.map((p) => (
          <Card key={p.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Video className="h-5 w-5 text-violet-600" />
                  <div className="font-medium">{p.name}</div>
                </div>
                <Badge variant="outline">Interface reserved</Badge>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {p.description}
              </p>
              <p className="mt-3 text-xs text-muted-foreground">
                Server contract: <code>generateVideoMeeting</code> in{" "}
                <code>src/lib/scheduling/video.functions.ts</code> — wired to
                the shared provider adapter registry.
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </SchedulerShell>
  );
}

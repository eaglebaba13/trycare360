/**
 * Clinical → My Day
 *
 * Personal work-list surface for doctors and therapists. Purely a
 * navigation/summary page — real appointment, queue and task data
 * comes from the existing Scheduling and Workflow engines when
 * their integration lands. No independent clinical data fetching.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarCheck, Users, ListChecks, Stethoscope, ClipboardList } from "lucide-react";
import { PageContainer } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { KpiCard, KpiGrid } from "@/components/standards";
import { ClinicalHeader } from "@/components/clinical/workspace-shell";

export const Route = createFileRoute("/_authenticated/clinical/my-day")({
  component: MyDayPage,
});

function MyDayPage() {
  return (
    <PageContainer>
      <ClinicalHeader
        title="My Day"
        subtitle="Your personal clinical work-list"
        actions={
          <Button asChild size="sm">
            <Link to="/clinical/encounters">
              <Stethoscope className="h-4 w-4 mr-1" /> Open Encounters
            </Link>
          </Button>
        }
      />
      <KpiGrid>
        <KpiCard label="Appointments" value="—" icon={CalendarCheck} hint="Today, assigned to me" />
        <KpiCard label="Waiting" value="—" icon={Users} hint="Live queue" />
        <KpiCard label="Open Encounters" value="—" icon={Stethoscope} />
        <KpiCard label="Tasks" value="—" icon={ListChecks} hint="Workflow engine" />
        <KpiCard label="Follow-ups" value="—" icon={ClipboardList} hint="Due today" />
      </KpiGrid>
      <div className="grid gap-4 lg:grid-cols-2 mt-6">
        <SectionCard title="Schedule" note="Reads from the Scheduling engine (personal calendar view)." />
        <SectionCard title="Queue" note="Reads from the Scheduling queue for the active branch." />
        <SectionCard title="Tasks" note="Reads from the Workflow engine — no new task store." />
        <SectionCard title="Follow-ups" note="Reads from the existing Follow-up engine." />
      </div>
    </PageContainer>
  );
}

function SectionCard({ title, note }: { title: string; note: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{note}</p>
      </CardContent>
    </Card>
  );
}

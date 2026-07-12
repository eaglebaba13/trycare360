import { KpiCard, KpiGrid } from "@/components/standards";
import { AlertTriangle, FileX2, ShieldOff, CalendarX2, Activity, Stethoscope, ListChecks, Copy } from "lucide-react";

export interface ClinicalQualityInput {
  closedEncounters: number;
  incompleteSoap: number;
  unsignedNotes: number;
  missingConsent: number;
  overdueFollowups: number;
  missingVitals: number;
  missingDiagnosis: number;
  openProblems: number;
  duplicateProblems: number;
}

export function QualityDashboard({ data }: { data: ClinicalQualityInput }) {
  return (
    <KpiGrid>
      <KpiCard label="Incomplete SOAP" value={data.incompleteSoap} icon={FileX2} tone={data.incompleteSoap ? "danger" : "success"} hint={`of ${data.closedEncounters} closed`} />
      <KpiCard label="Unsigned Notes" value={data.unsignedNotes} icon={AlertTriangle} tone={data.unsignedNotes ? "warning" : "success"} />
      <KpiCard label="Missing Consent" value={data.missingConsent} icon={ShieldOff} tone={data.missingConsent ? "danger" : "success"} />
      <KpiCard label="Overdue Follow-ups" value={data.overdueFollowups} icon={CalendarX2} tone={data.overdueFollowups ? "warning" : "success"} />
      <KpiCard label="Missing Vitals" value={data.missingVitals} icon={Activity} tone={data.missingVitals ? "warning" : "success"} />
      <KpiCard label="Missing Diagnosis" value={data.missingDiagnosis} icon={Stethoscope} tone={data.missingDiagnosis ? "warning" : "success"} />
      <KpiCard label="Open Problems" value={data.openProblems} icon={ListChecks} />
      <KpiCard label="Duplicate Problems" value={data.duplicateProblems} icon={Copy} tone={data.duplicateProblems ? "warning" : "success"} />
    </KpiGrid>
  );
}

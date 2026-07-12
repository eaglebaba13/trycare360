/**
 * ClinicalKpiBar — reuses KpiCard/KpiGrid, exposes clinical-flavoured
 * icons + formatting helpers. No local KPI formulas: all values are
 * computed server-side by the Stage 6 Analytics Service.
 */
import { KpiCard, KpiGrid } from "@/components/standards";
import { Activity, Stethoscope, ClipboardList, Pill, CalendarClock, Share2, Sparkles, CheckCircle2 } from "lucide-react";

export interface ClinicalExecutiveKpiInput {
  dailyConsultations: number;
  completedEncounters: number;
  openEncounters: number;
  treatmentPlans: number;
  activePrescriptions: number;
  followupsDue: number;
  referralVolume: number;
  aiUsage: number;
}

export function ClinicalKpiBar({ kpis }: { kpis: ClinicalExecutiveKpiInput }) {
  return (
    <KpiGrid>
      <KpiCard label="Daily Consultations" value={kpis.dailyConsultations} icon={Stethoscope} tone="info" />
      <KpiCard label="Completed Encounters" value={kpis.completedEncounters} icon={CheckCircle2} tone="success" />
      <KpiCard label="Open Encounters" value={kpis.openEncounters} icon={Activity} tone="warning" />
      <KpiCard label="Treatment Plans" value={kpis.treatmentPlans} icon={ClipboardList} />
      <KpiCard label="Active Prescriptions" value={kpis.activePrescriptions} icon={Pill} tone="info" />
      <KpiCard label="Follow-ups Due" value={kpis.followupsDue} icon={CalendarClock} tone="warning" />
      <KpiCard label="Referral Volume" value={kpis.referralVolume} icon={Share2} />
      <KpiCard label="Clinical AI Usage" value={kpis.aiUsage} icon={Sparkles} tone="info" />
    </KpiGrid>
  );
}

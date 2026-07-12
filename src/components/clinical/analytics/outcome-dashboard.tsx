import { KpiCard, KpiGrid } from "@/components/standards";
import { TrendingUp, HeartHandshake, Repeat, CalendarCheck2, UserMinus, ShieldCheck } from "lucide-react";

export interface ClinicalOutcomeInput {
  totalPlans: number;
  completedPlans: number;
  activePlans: number;
  droppedPlans: number;
  treatmentSuccess: number;
  recoveryRate: number;
  repeatVisitRate: number;
  followupCompletion: number;
  dropOff: number;
  protocolCompliance: number;
}

const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

export function OutcomeDashboard({ data }: { data: ClinicalOutcomeInput }) {
  return (
    <KpiGrid>
      <KpiCard label="Treatment Success" value={pct(data.treatmentSuccess)} icon={TrendingUp} tone="success" hint={`${data.completedPlans}/${data.totalPlans} plans`} />
      <KpiCard label="Recovery Rate" value={pct(data.recoveryRate)} icon={HeartHandshake} tone="success" />
      <KpiCard label="Repeat Visit Rate" value={pct(data.repeatVisitRate)} icon={Repeat} tone="info" />
      <KpiCard label="Follow-up Completion" value={pct(data.followupCompletion)} icon={CalendarCheck2} tone="info" />
      <KpiCard label="Drop-off Rate" value={pct(data.dropOff)} icon={UserMinus} tone="warning" hint={`${data.droppedPlans} plans dropped`} />
      <KpiCard label="Protocol Compliance" value={pct(data.protocolCompliance)} icon={ShieldCheck} tone="success" />
      <KpiCard label="Active Plans" value={data.activePlans} icon={TrendingUp} />
      <KpiCard label="Total Plans" value={data.totalPlans} icon={TrendingUp} />
    </KpiGrid>
  );
}

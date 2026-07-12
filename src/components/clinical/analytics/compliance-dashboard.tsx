import { KpiCard, KpiGrid } from "@/components/standards";
import { ShieldCheck, FileSignature, FileText, Eye, GitCompare, ShieldAlert, ClipboardCheck } from "lucide-react";

export interface ClinicalComplianceInput {
  consentCompliance: number;
  totalConsents: number;
  signedConsents: number;
  clinicalSignatures: number;
  totalNotes: number;
  documentationCompleteness: number;
  auditEvents: number;
  accessLogs: number;
  clinicalRecordChanges: number;
  rlsCompliance: number;
}

const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

export function ComplianceDashboard({ data }: { data: ClinicalComplianceInput }) {
  return (
    <KpiGrid>
      <KpiCard label="Consent Compliance" value={pct(data.consentCompliance)} icon={ShieldCheck} tone="success" hint={`${data.signedConsents}/${data.totalConsents} signed`} />
      <KpiCard label="Clinical Signatures" value={data.clinicalSignatures} icon={FileSignature} tone="info" hint={`of ${data.totalNotes} notes`} />
      <KpiCard label="Documentation Complete" value={pct(data.documentationCompleteness)} icon={ClipboardCheck} tone="success" />
      <KpiCard label="Audit Events" value={data.auditEvents} icon={FileText} />
      <KpiCard label="Access Logs" value={data.accessLogs} icon={Eye} />
      <KpiCard label="Record Changes" value={data.clinicalRecordChanges} icon={GitCompare} />
      <KpiCard label="RLS Compliance" value={pct(data.rlsCompliance)} icon={ShieldAlert} tone="success" hint="DB-enforced" />
    </KpiGrid>
  );
}

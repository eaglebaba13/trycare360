/**
 * Universal Patient Context Bar
 * ------------------------------------------------------------------
 * Renders a consistent, sticky header of patient identity + key
 * flags at the top of every patient-related workspace (Patient 360,
 * CRM, Clinical, Billing, Inventory, Support). Reuse across modules
 * to avoid duplicating patient header logic and to give staff a
 * single, predictable context anchor when working with a patient.
 *
 * Consumes existing `getPatientSummaryFull` — no new business logic.
 */
import { Link } from "@tanstack/react-router";
import { AlertTriangle, ShieldCheck, Star, Stethoscope, Building2, QrCode } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { initials } from "@/lib/standards-format";
import type { Tables } from "@/integrations/supabase/types";

export interface PatientContextBarProps {
  person: Tables<"persons">;
  patient?: Tables<"patients"> | null;
  alertCount?: number;
  outstanding?: number | null;
  membershipTier?: string | null;
  subscriptionPlan?: string | null;
  riskLevel?: "low" | "medium" | "high" | null;
  compact?: boolean;
  actions?: React.ReactNode;
}

function ageFromDob(dob: string | null | undefined): string {
  if (!dob) return "—";
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return "—";
  const diff = Date.now() - d.getTime();
  const years = Math.floor(diff / (365.25 * 24 * 3600 * 1000));
  return `${years}y`;
}

const RISK_TONE: Record<string, string> = {
  low: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  medium: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
  high: "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30",
};

export function PatientContextBar({
  person,
  patient,
  alertCount = 0,
  outstanding,
  membershipTier,
  subscriptionPlan,
  riskLevel,
  compact = false,
  actions,
}: PatientContextBarProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <div className="sticky top-16 z-10 -mx-4 lg:-mx-8 px-4 lg:px-8 py-3 border-b bg-card/90 backdrop-blur">
        <div className="flex flex-wrap items-center gap-3">
          <Link to="/patients/$personId" params={{ personId: person.id }} className="flex items-center gap-3 min-w-0 flex-1">
            <Avatar className={compact ? "h-9 w-9" : "h-12 w-12"}>
              {person.photo_url && <AvatarImage src={person.photo_url} alt={person.full_name} />}
              <AvatarFallback>{initials(person.full_name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-display font-semibold truncate">{person.full_name}</span>
                {person.vip_flag && (
                  <Badge className="bg-amber-500 hover:bg-amber-500 gap-1">
                    <Star className="h-3 w-3" /> VIP
                  </Badge>
                )}
                {person.verification_status === "verified" && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex"><ShieldCheck className="h-4 w-4 text-emerald-600" /></span>
                    </TooltipTrigger>
                    <TooltipContent>Verified identity</TooltipContent>
                  </Tooltip>
                )}
                {alertCount > 0 && (
                  <Badge variant="destructive" className="gap-1">
                    <AlertTriangle className="h-3 w-3" /> {alertCount} alert{alertCount === 1 ? "" : "s"}
                  </Badge>
                )}
                {riskLevel && (
                  <Badge variant="outline" className={RISK_TONE[riskLevel]}>{riskLevel.toUpperCase()} RISK</Badge>
                )}
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                {patient?.mrn && <span className="font-mono">MRN {patient.mrn}</span>}
                <span className="font-mono opacity-70">#{person.id.slice(0, 8)}</span>
                <span>{ageFromDob(person.dob)} · {person.gender ?? "—"}</span>
                {patient?.blood_group && <span>Blood {patient.blood_group}</span>}
                {patient?.primary_doctor_id && (
                  <span className="flex items-center gap-1"><Stethoscope className="h-3 w-3" /> Doctor assigned</span>
                )}
                {patient?.home_branch_id && (
                  <span className="flex items-center gap-1"><Building2 className="h-3 w-3" /> Branch</span>
                )}
                {membershipTier && <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">{membershipTier}</Badge>}
                {subscriptionPlan && <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">{subscriptionPlan}</Badge>}
                {outstanding != null && outstanding > 0 && (
                  <span className="text-rose-600 dark:text-rose-400 font-medium">₹{outstanding.toLocaleString()} due</span>
                )}
              </div>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" aria-label="Patient QR">
                  <QrCode className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Patient QR / MRN scan</TooltipContent>
            </Tooltip>
            {actions}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

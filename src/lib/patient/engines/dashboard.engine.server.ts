import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "@/integrations/supabase/types";
import {
  DashboardPreferenceRepository,
  DigitalConsentRepository,
  FamilyMemberRepository,
  HealthGoalRepository,
  MembershipRepository,
  NotificationHistoryRepository,
  PatientDocumentRepository,
  WalletRepository,
} from "../repositories.server";
import { assertFamilyPermission, resolvePatientIdentity } from "../helpers.server";
import { PatientRecordsEngine } from "./records.engine.server";
import { AppointmentPortalEngine } from "./appointments.engine.server";

// biome-ignore lint/suspicious/noExplicitAny: escape from deep generics
type SB = SupabaseClient<Database> | any;

export interface PatientPortalDashboard {
  patient: Tables<"patient_profiles"> | null;
  person: Tables<"persons"> | null;
  patientRecord: Tables<"patients"> | null;
  upcomingAppointments: unknown[];
  recentEncounters: unknown[];
  activePrescriptions: unknown[];
  labReports: unknown[];
  radiologyReports: unknown[];
  pharmacyOrders: unknown[];
  invoices: unknown[];
  payments: unknown[];
  wallet: Tables<"patient_wallet"> | null;
  memberships: Tables<"patient_memberships">[];
  rewards: Tables<"patient_reward_redemptions">[];
  documents: Tables<"patient_documents">[];
  notifications: Tables<"patient_notification_history">[];
  healthGoals: Tables<"patient_health_goals">[];
  familyAccess: Tables<"patient_family_members">[];
  consents: Tables<"patient_digital_consents">[];
  layout: Tables<"patient_dashboard_preferences"> | null;
  permissions: { canView: boolean; canBook: boolean; canPay: boolean; canManage: boolean };
}

export class DashboardEngine {
  constructor(private readonly sb: SB) {}

  async getDashboard(args: {
    viewerUserId: string;
    targetUserId?: string;
    limit?: number;
  }): Promise<PatientPortalDashboard> {
    const targetUserId = args.targetUserId ?? args.viewerUserId;
    if (targetUserId !== args.viewerUserId) {
      await assertFamilyPermission(this.sb, {
        viewerUserId: args.viewerUserId,
        targetUserId,
        capability: "view",
      });
    }
    const identity = await resolvePatientIdentity(this.sb, targetUserId);
    const limit = args.limit ?? 10;

    const appts = new AppointmentPortalEngine(this.sb);
    const records = new PatientRecordsEngine(this.sb);

    const [
      personRes,
      patientRes,
      upcoming,
      encounters,
      prescriptions,
      labReports,
      radiologyReports,
      pharmacyOrders,
      invoices,
      payments,
      wallet,
      memberships,
      redemptions,
      documents,
      notifications,
      goals,
      family,
      consents,
      layout,
    ] = await Promise.all([
      identity.personId
        ? this.sb.from("persons").select("*").eq("id", identity.personId).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      identity.patientId
        ? this.sb.from("patients").select("*").eq("id", identity.patientId).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      appts.listAppointments({
        viewerUserId: args.viewerUserId,
        targetUserId,
        upcomingOnly: true,
        limit,
      }),
      records.listEncounters({ viewerUserId: args.viewerUserId, targetUserId, limit }),
      records.listPrescriptions({ viewerUserId: args.viewerUserId, targetUserId, limit }),
      records.listLabReports({ viewerUserId: args.viewerUserId, targetUserId, limit }),
      records.listRadiologyReports({ viewerUserId: args.viewerUserId, targetUserId, limit }),
      records.listPharmacyOrders({ viewerUserId: args.viewerUserId, targetUserId, limit }),
      records.listInvoices({ viewerUserId: args.viewerUserId, targetUserId, limit }),
      records.listPayments({ viewerUserId: args.viewerUserId, targetUserId, limit }),
      new WalletRepository(this.sb).getByUser(targetUserId),
      new MembershipRepository(this.sb).list(targetUserId),
      new (await import("../repositories.server")).RewardRedemptionRepository(this.sb).list(targetUserId, limit),
      new PatientDocumentRepository(this.sb).list(targetUserId, { limit }),
      new NotificationHistoryRepository(this.sb).list(targetUserId, limit),
      new HealthGoalRepository(this.sb).list(targetUserId),
      new FamilyMemberRepository(this.sb).listForPrimary(targetUserId),
      new DigitalConsentRepository(this.sb).list(targetUserId),
      new DashboardPreferenceRepository(this.sb).get(targetUserId),
    ]);

    // Compute delegated permissions the viewer holds against this target
    let perms = { canView: true, canBook: true, canPay: true, canManage: true };
    if (args.viewerUserId !== targetUserId) {
      const { data } = await this.sb
        .from("patient_family_members")
        .select("can_view, can_book, can_pay, can_manage, status")
        .eq("primary_user_id", targetUserId)
        .eq("member_user_id", args.viewerUserId)
        .eq("status", "accepted")
        .maybeSingle();
      const row = data as null | {
        can_view: boolean;
        can_book: boolean;
        can_pay: boolean;
        can_manage: boolean;
      };
      perms = {
        canView: Boolean(row?.can_view),
        canBook: Boolean(row?.can_book),
        canPay: Boolean(row?.can_pay),
        canManage: Boolean(row?.can_manage),
      };
    }

    return {
      patient: identity.profile,
      person: (personRes.data ?? null) as Tables<"persons"> | null,
      patientRecord: (patientRes.data ?? null) as Tables<"patients"> | null,
      upcomingAppointments: upcoming,
      recentEncounters: encounters,
      activePrescriptions: prescriptions,
      labReports,
      radiologyReports,
      pharmacyOrders,
      invoices,
      payments,
      wallet,
      memberships,
      rewards: redemptions,
      documents,
      notifications,
      healthGoals: goals,
      familyAccess: family,
      consents,
      layout,
      permissions: perms,
    };
  }
}

/**
 * Phase 2.10 Patient Portal — Zod validators for Stage 2 server functions.
 * Engines assume already-validated data.
 */
import { z } from "zod";

const uuid = z.string().uuid();
const optionalUuid = uuid.nullish();
const jsonRecord = z.record(z.string(), z.unknown());

// Common
export const emptySchema = z.object({}).strict();
export const targetUserSchema = z
  .object({ targetUserId: uuid.optional() })
  .strict();

// Profile
export const updateProfileSchema = z.object({
  displayName: z.string().max(120).nullish(),
  avatarUrl: z.string().url().max(2048).nullish(),
  coverUrl: z.string().url().max(2048).nullish(),
  bio: z.string().max(4000).nullish(),
  locale: z.string().max(20).nullish(),
  timezone: z.string().max(64).nullish(),
  meta: jsonRecord.optional(),
});
export const upsertPreferenceSchema = z.object({
  category: z.string().min(1),
  key: z.string().min(1),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value: z.any() as z.ZodType<any>,
});
export const updateSettingsSchema = z.object({
  settings: jsonRecord,
});

// Family
export const createFamilyAccountSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullish(),
  meta: jsonRecord.optional(),
});
export const addFamilyMemberSchema = z.object({
  familyAccountId: uuid.nullish(),
  memberUserId: uuid.nullish(),
  memberPatientId: uuid.nullish(),
  displayName: z.string().nullish(),
  relationship: z.string().min(1),
  canView: z.boolean().optional(),
  canBook: z.boolean().optional(),
  canPay: z.boolean().optional(),
  canManage: z.boolean().optional(),
});
export const updateFamilyPermissionsSchema = z.object({
  memberId: uuid,
  canView: z.boolean().optional(),
  canBook: z.boolean().optional(),
  canPay: z.boolean().optional(),
  canManage: z.boolean().optional(),
  status: z.enum(["invited", "accepted", "revoked"]).optional(),
});
export const memberIdSchema = z.object({ memberId: uuid });
export const switchPatientContextSchema = z.object({ targetUserId: uuid });

// Dashboard
export const dashboardSchema = z.object({
  targetUserId: uuid.optional(),
  limit: z.number().int().min(1).max(50).optional(),
});

// Appointments
export const listAppointmentsSchema = z.object({
  targetUserId: uuid.optional(),
  status: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  limit: z.number().int().min(1).max(200).optional(),
});
export const bookAppointmentSchema = z.object({
  targetUserId: uuid.optional(),
  slotId: uuid.optional(),
  appointmentTypeId: uuid.optional(),
  practitionerId: uuid.optional(),
  startsAt: z.string(),
  endsAt: z.string(),
  reason: z.string().nullish(),
  meta: jsonRecord.optional(),
});
export const rescheduleAppointmentSchema = z.object({
  appointmentId: uuid,
  startsAt: z.string(),
  endsAt: z.string(),
});
export const cancelAppointmentSchema = z.object({
  appointmentId: uuid,
  reason: z.string().nullish(),
});
export const appointmentIdSchema = z.object({ appointmentId: uuid });
export const queueStatusSchema = z.object({
  targetUserId: uuid.optional(),
});

// Records
export const recordsWindowSchema = z.object({
  targetUserId: uuid.optional(),
  limit: z.number().int().min(1).max(200).optional(),
});

// Documents
export const listDocumentsSchema = z.object({
  targetUserId: uuid.optional(),
  folderId: uuid.nullish(),
  limit: z.number().int().min(1).max(500).optional(),
});
export const createFolderSchema = z.object({
  name: z.string().min(1),
  parentId: uuid.nullish(),
  color: z.string().nullish(),
  icon: z.string().nullish(),
});
export const saveReportSchema = z.object({
  reportType: z.string().min(1),
  referenceId: uuid,
  title: z.string().min(1),
  meta: jsonRecord.optional(),
});
export const savePrescriptionSchema = z.object({
  prescriptionId: uuid,
  notes: z.string().nullish(),
  meta: jsonRecord.optional(),
});
export const signedUrlSchema = z.object({
  documentId: uuid,
  expiresIn: z.number().int().min(60).max(3600).optional(),
});

// Wallet
export const walletTxListSchema = z.object({
  targetUserId: uuid.optional(),
  limit: z.number().int().min(1).max(500).optional(),
});
export const walletPaymentRequestSchema = z.object({
  amount: z.number().positive(),
  currency: z.string().min(3).max(6).optional(),
  referenceType: z.string().min(1),
  referenceId: uuid,
  note: z.string().nullish(),
  idempotencyKey: z.string().min(1).max(120).optional(),
});

// Membership
export const activateMembershipSchema = z.object({
  planCode: z.string().min(1),
  planName: z.string().min(1),
  tier: z.string().nullish(),
  price: z.number().nonnegative(),
  currency: z.string().default("INR"),
  autoRenew: z.boolean().optional(),
  startsAt: z.string().optional(),
  expiresAt: z.string().optional(),
  meta: jsonRecord.optional(),
});
export const membershipIdSchema = z.object({ membershipId: uuid });
export const renewMembershipSchema = z.object({
  membershipId: uuid,
  expiresAt: z.string(),
  meta: jsonRecord.optional(),
});
export const cancelMembershipSchema = z.object({
  membershipId: uuid,
  reason: z.string().nullish(),
});

// Loyalty
export const loyaltyTxListSchema = z.object({
  targetUserId: uuid.optional(),
  limit: z.number().int().min(1).max(500).optional(),
});
export const listRewardsSchema = z.object({
  tenantId: uuid.optional(),
  limit: z.number().int().min(1).max(200).optional(),
});
export const redeemRewardSchema = z.object({
  rewardId: uuid,
  meta: jsonRecord.optional(),
});

// Notifications
export const updateNotificationPrefSchema = z.object({
  category: z.string().min(1),
  channel: z.string().min(1),
  enabled: z.boolean(),
  quietHoursStart: z.string().nullish(),
  quietHoursEnd: z.string().nullish(),
});
export const registerPushTokenSchema = z.object({
  provider: z.string().min(1),
  token: z.string().min(1),
  deviceId: z.string().nullish(),
});
export const removePushTokenSchema = z.object({
  token: z.string().min(1),
});
export const notificationHistorySchema = z.object({
  limit: z.number().int().min(1).max(200).optional(),
});

// Health
export const upsertHealthGoalSchema = z.object({
  id: uuid.optional(),
  goalType: z.string().min(1),
  title: z.string().min(1),
  description: z.string().nullish(),
  targetValue: z.number().nullish(),
  targetUnit: z.string().nullish(),
  targetDate: z.string().nullish(),
  status: z.string().optional(),
  meta: jsonRecord.optional(),
});
export const recordHealthMetricSchema = z.object({
  metricCode: z.string().min(1),
  value: z.number().nullish(),
  valueText: z.string().nullish(),
  unit: z.string().nullish(),
  recordedAt: z.string().optional(),
  source: z.string().optional(),
  deviceId: z.string().nullish(),
  meta: jsonRecord.optional(),
});
export const listHealthMetricsSchema = z.object({
  metricCode: z.string().optional(),
  limit: z.number().int().min(1).max(500).optional(),
});

// Passport
export const updatePassportVisibilitySchema = z.object({
  isActive: z.boolean().optional(),
  meta: jsonRecord.optional(),
});

// Consent
export const recordConsentSchema = z.object({
  consentType: z.string().min(1),
  version: z.string().min(1),
  signature: z.string().nullish(),
  meta: jsonRecord.optional(),
});
export const consentIdSchema = z.object({ consentId: uuid });

// Support
export const createTicketSchema = z.object({
  subject: z.string().min(1),
  body: z.string().min(1),
  category: z.string().nullish(),
  priority: z.string().nullish(),
  meta: jsonRecord.optional(),
});
export const submitFeedbackSchema = z.object({
  targetType: z.string().min(1),
  targetId: uuid,
  rating: z.number().int().min(1).max(5),
  comment: z.string().nullish(),
  sentiment: z.string().nullish(),
  meta: jsonRecord.optional(),
});

// Conversations
export const createConversationSchema = z.object({
  topic: z.string().nullish(),
  channel: z.string().optional(),
  meta: jsonRecord.optional(),
});
export const sendChatMessageSchema = z.object({
  conversationId: uuid,
  body: z.string().min(1),
  attachments: z.array(jsonRecord).optional(),
});
export const conversationIdSchema = z.object({ conversationId: uuid });

// Sessions
export const revokeSessionSchema = z.object({ sessionId: uuid });

// Payments
export const paymentsListSchema = z.object({
  targetUserId: uuid.optional(),
  limit: z.number().int().min(1).max(200).optional(),
});
export const paymentLinkRequestSchema = z.object({
  invoiceId: uuid,
  amount: z.number().positive(),
  currency: z.string().optional(),
  meta: jsonRecord.optional(),
});
export const refundStatusSchema = z.object({ paymentId: uuid });

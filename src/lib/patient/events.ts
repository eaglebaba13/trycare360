/**
 * Phase 2.10 Patient Portal — Workflow event constants.
 *
 * Emitted through the platform Workflow / Automation Engine
 * (`emit_automation_event` RPC). The Patient Portal never runs its own
 * bus — every event listed here flows through the same engine used by
 * Automation Triggers, Notification Rules, Timeline and Analytics.
 *
 * Stage 1 delivers constants only. Emission wires up in Stage 2 (engines).
 */

export const PATIENT_EVENTS = {
  // Session & profile
  Login:                 "patient.login",
  Logout:                "patient.logout",
  ProfileUpdated:        "patient.profile.updated",
  PreferenceUpdated:     "patient.preference.updated",

  // Documents
  DocumentUploaded:      "patient.document.uploaded",
  DocumentShared:        "patient.document.shared",
  DocumentDeleted:       "patient.document.deleted",

  // Wallet
  WalletUpdated:         "patient.wallet.updated",
  WalletCredited:        "patient.wallet.credited",
  WalletDebited:         "patient.wallet.debited",
  WalletBlocked:         "patient.wallet.blocked",

  // Membership
  MembershipStarted:     "patient.membership.started",
  MembershipRenewed:     "patient.membership.renewed",
  MembershipUpgraded:    "patient.membership.upgraded",
  MembershipCancelled:   "patient.membership.cancelled",
  MembershipExpired:     "patient.membership.expired",

  // Loyalty & rewards
  LoyaltyEarned:         "patient.loyalty.earned",
  LoyaltyAdjusted:       "patient.loyalty.adjusted",
  RewardEarned:          "patient.reward.earned",
  RewardRedeemed:        "patient.reward.redeemed",
  RewardFulfilled:       "patient.reward.fulfilled",

  // Notifications
  NotificationSent:      "patient.notification.sent",
  NotificationDelivered: "patient.notification.delivered",
  NotificationRead:      "patient.notification.read",
  NotificationClicked:   "patient.notification.clicked",

  // Family
  FamilyUpdated:         "patient.family.updated",
  FamilyMemberInvited:   "patient.family.member_invited",
  FamilyMemberAccepted:  "patient.family.member_accepted",
  FamilyMemberRemoved:   "patient.family.member_removed",

  // Health goals & metrics
  HealthGoalUpdated:     "patient.health_goal.updated",
  HealthGoalAchieved:    "patient.health_goal.achieved",
  HealthMetricLogged:    "patient.health_metric.logged",

  // Feedback / support
  FeedbackCreated:       "patient.feedback.created",
  SupportCreated:        "patient.support.created",
  SupportResolved:       "patient.support.resolved",

  // Consents & passport
  ConsentGranted:        "patient.consent.granted",
  ConsentRevoked:        "patient.consent.revoked",
  PassportUpdated:       "patient.passport.updated",

  // Devices
  DeviceRegistered:      "patient.device.registered",
  DeviceRevoked:         "patient.device.revoked",
  PushTokenRegistered:   "patient.push_token.registered",

  // Conversations
  ConversationOpened:    "patient.conversation.opened",
  ConversationMessage:   "patient.conversation.message",
  ConversationClosed:    "patient.conversation.closed",
} as const;

export type PatientEvent = (typeof PATIENT_EVENTS)[keyof typeof PATIENT_EVENTS];
